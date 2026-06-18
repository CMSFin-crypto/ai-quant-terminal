/**
 * Yahoo Finance free data source — no API key required.
 * Uses the v8 chart endpoint for quotes and historical candles.
 * Uses the v7 options endpoint with crumb authentication for real options chains.
 *
 * All fetch calls include an AbortController timeout to prevent hanging.
 */

import type { PolygonOptionContract } from "./workstation";

const YAHUA_FETCH_TIMEOUT_MS = 8_000;
const OPTIONS_FETCH_TIMEOUT_MS = 10_000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type YahooBar = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type YahooQuoteResult = {
  price: number | null;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  source: string;
};

export type YahooHistoryResult = {
  results: YahooBar[];
  source: string;
};

const emptyQuote = (source: string): YahooQuoteResult => ({
  price: null, change: 0, changePercent: 0, high: 0, low: 0, open: 0, previousClose: 0, source
});

const emptyHistory = (source: string): YahooHistoryResult => ({
  results: [], source
});

/**
 * Fetch current quote from Yahoo Finance.
 * Uses the v8 chart endpoint with a 5-day range to ensure we get the latest price.
 */
export async function fetchYahooQuote(symbol: string): Promise<YahooQuoteResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), YAHUA_FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 30 },
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      return emptyQuote("yahoo-error");
    }

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta?.regularMarketPrice) {
      return emptyQuote("yahoo-no-data");
    }

    const prevClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;

    return {
      price: Number(meta.regularMarketPrice) || null,
      change: Number(meta.regularMarketPrice - prevClose),
      changePercent: Number(((meta.regularMarketPrice - prevClose) / prevClose * 100).toFixed(2)),
      high: Number(meta.regularMarketDayHigh || 0),
      low: Number(meta.regularMarketDayLow || 0),
      open: Number(meta.regularMarketOpen || 0),
      previousClose: Number(prevClose),
      source: "yahoo"
    };
  } catch {
    return emptyQuote("yahoo-error");
  }
}

/**
 * Fetch historical daily candles from Yahoo Finance.
 * Default 1 year of daily data.
 */
export async function fetchYahooHistory(symbol: string, days = 365): Promise<YahooHistoryResult> {
  const range = days <= 30 ? "1mo" : days <= 90 ? "3mo" : days <= 180 ? "6mo" : days <= 400 ? "1y" : "2y";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), YAHUA_FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      return emptyHistory("yahoo-error");
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      return emptyHistory("yahoo-no-data");
    }

    const timestamps: number[] = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];

    if (!quotes) {
      return emptyHistory("yahoo-no-quotes");
    }

    const closes: number[] = quotes.close || [];
    const opens: number[] = quotes.open || [];
    const highs: number[] = quotes.high || [];
    const lows: number[] = quotes.low || [];
    const volumes: number[] = quotes.volume || [];

    const bars: YahooBar[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (!Number.isFinite(close) || close <= 0) continue;

      bars.push({
        t: timestamps[i] * 1000,
        o: Number(opens[i]) || close,
        h: Number(highs[i]) || close,
        l: Number(lows[i]) || close,
        c: close,
        v: Number(volumes[i]) || 0
      });
    }

    return {
      results: bars,
      source: "yahoo"
    };
  } catch {
    return emptyHistory("yahoo-error");
  }
}

// ─── Yahoo Finance Options Chain with Crumb Auth ─────────────────────────────

type YahooOptionContract = {
  contractSymbol?: string;
  strike?: number;
  currency?: string;
  lastPrice?: number;
  change?: number;
  percentChange?: number;
  volume?: number;
  openInterest?: number;
  bid?: number;
  ask?: number;
  contractSize?: string;
  expiration?: number;       // Unix timestamp (seconds)
  lastTradeDate?: number;    // Unix timestamp (seconds)
  impliedVolatility?: number;
  inTheMoney?: boolean;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
};

type YahooOptionsExpiry = {
  expirationDate: number;    // Unix timestamp (seconds)
  hasMiniOptions: boolean;
  calls: YahooOptionContract[];
  puts: YahooOptionContract[];
};

type YahooOptionsResult = {
  results: PolygonOptionContract[];
  source: string;
  underlyingPrice: number | null;
};

const emptyOptions = (source: string): YahooOptionsResult => ({
  results: [], source, underlyingPrice: null
});

/**
 * Convert a Yahoo Finance option contract into the PolygonOptionContract shape
 * so the existing pickOptionContract() / normalizePolygonOption() pipeline
 * works without any changes.
 */
function normalizeYahooContract(
  contract: YahooOptionContract,
  optionType: "call" | "put"
): PolygonOptionContract {
  const expDate = contract.expiration
    ? new Date(contract.expiration * 1000).toISOString().slice(0, 10)
    : undefined;

  const bid = Number(contract.bid || 0);
  const ask = Number(contract.ask || 0);
  const midpoint = bid > 0 && ask > 0 ? (bid + ask) / 2 : undefined;

  return {
    details: {
      contract_type: optionType,
      strike_price: Number(contract.strike || 0),
      expiration_date: expDate,
    },
    implied_volatility: Number(contract.impliedVolatility || 0),
    last_quote: {
      midpoint: midpoint ?? Number(contract.lastPrice || 0),
    },
    last_trade: {
      price: Number(contract.lastPrice || 0),
    },
    day: {
      volume: Number(contract.volume || 0),
    },
    open_interest: Number(contract.openInterest || 0),
    underlying_asset: undefined,
    greeks: {
      delta: contract.delta != null ? Number(contract.delta) : undefined,
      gamma: contract.gamma != null ? Number(contract.gamma) : undefined,
      theta: contract.theta != null ? Number(contract.theta) : undefined,
    },
  };
}

/**
 * Pick the expiration date closest to `targetDte` days from now.
 * Returns the Unix timestamp (seconds) of the chosen expiry.
 */
function pickClosestExpiry(
  expirationDates: number[],
  targetDte = 30
): number | null {
  if (!expirationDates.length) return null;

  const now = Date.now();
  const targetMs = now + targetDte * 86_400_000;

  let best = expirationDates[0];
  let bestDist = Math.abs(expirationDates[0] * 1000 - targetMs);

  for (const ts of expirationDates) {
    const dist = Math.abs(ts * 1000 - targetMs);
    if (dist < bestDist) {
      bestDist = dist;
      best = ts;
    }
  }

  return best;
}

// ─── Crumb Management ────────────────────────────────────────────────────────
// Yahoo Finance v7 API requires a "crumb" + cookies for authentication.
// Node.js fetch does NOT auto-persist cookies between requests,
// so we manually capture Set-Cookie from fc.yahoo.com and pass it along.

let cachedCrumb: string | null = null;
let cachedCookies: string | null = null;
let crumbExpiresAt = 0;
const CRUMB_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (shorter TTL for safety)

async function getYahooCrumb(): Promise<{ crumb: string; cookies: string } | null> {
  // Return cached crumb+cookies if still valid
  if (cachedCrumb && cachedCookies && Date.now() < crumbExpiresAt) {
    return { crumb: cachedCrumb, cookies: cachedCookies };
  }

  try {
    // Step 1: Visit fc.yahoo.com to get session cookies (A1/A3)
    const fcRes = await fetch("https://fc.yahoo.com/", {
      headers: { "User-Agent": UA },
      next: { revalidate: 0 },
      redirect: "manual",
    });

    // Extract Set-Cookie headers and build a cookie string
    const setCookieHeaders = fcRes.headers.getSetCookie?.() || [];
    const cookieParts = setCookieHeaders.map((c: string) => c.split(";")[0]);
    const cookies = cookieParts.join("; ");

    if (!cookies) return null;

    // Step 2: Get the crumb using the session cookies
    const crumbRes = await fetch(
      "https://query1.finance.yahoo.com/v1/test/getcrumb",
      {
        headers: { "User-Agent": UA, Cookie: cookies },
        next: { revalidate: 0 },
      }
    );

    if (!crumbRes.ok) return null;

    const crumb = await crumbRes.text();

    if (!crumb || crumb.includes("error") || crumb.includes("Unauthorized")) {
      return null;
    }

    // Cache both crumb and cookies
    cachedCrumb = crumb;
    cachedCookies = cookies;
    crumbExpiresAt = Date.now() + CRUMB_TTL_MS;

    return { crumb, cookies };
  } catch {
    return null;
  }
}

/**
 * Fetch real options chain from Yahoo Finance v7 endpoint.
 * Uses crumb-based authentication to bypass the "Invalid Crumb" error.
 * Tries the ~30 DTE expiration first; falls back to the nearest expiry.
 *
 * Returns contracts normalized into PolygonOptionContract[] format.
 */
export async function fetchYahooOptions(symbol: string, targetDte = 30): Promise<YahooOptionsResult> {
  // Step 0: Get authentication crumb + cookies
  const auth = await getYahooCrumb();
  if (!auth) return emptyOptions("yahoo-options-no-crumb");

  const { crumb, cookies } = auth;
  const baseOptionsUrl = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`;
  const baseHeaders = { "User-Agent": UA, Cookie: cookies };

  try {
    // Step 1: Fetch the default expiry (nearest) with crumb + cookies
    const controller1 = new AbortController();
    const timer1 = setTimeout(() => controller1.abort(), OPTIONS_FETCH_TIMEOUT_MS);

    const res1 = await fetch(
      `${baseOptionsUrl}?crumb=${encodeURIComponent(crumb)}`,
      {
        headers: baseHeaders,
        next: { revalidate: 60 },
        signal: controller1.signal,
      }
    );

    clearTimeout(timer1);

    if (!res1.ok) {
      // Crumb/cookies might have expired — clear cache for next attempt
      cachedCrumb = null;
      cachedCookies = null;
      return emptyOptions("yahoo-options-error");
    }

    const data1 = await res1.json();

    // Check for crumb/auth error in the response body
    if (data1?.finance?.error) {
      cachedCrumb = null;
      cachedCookies = null;
      return emptyOptions("yahoo-options-auth-failed");
    }

    const chain = data1?.optionChain?.result?.[0];

    if (!chain) return emptyOptions("yahoo-options-no-data");

    const allExpirations: number[] = chain.expirationDates || [];
    const underlyingPrice = chain.quote?.regularMarketPrice ?? null;

    // Step 2: Check if default expiry is near target DTE, otherwise fetch the right one
    let optionsData: YahooOptionsExpiry[];

    const defaultExpiry = chain.options?.[0]?.expirationDate;
    const targetExpiry = pickClosestExpiry(allExpirations, targetDte);

    if (defaultExpiry && targetExpiry && Math.abs(defaultExpiry - targetExpiry) < 3 * 86400) {
      optionsData = chain.options || [];
    } else if (targetExpiry) {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), OPTIONS_FETCH_TIMEOUT_MS);

      const res2 = await fetch(
        `${baseOptionsUrl}?date=${targetExpiry}&crumb=${encodeURIComponent(crumb)}`,
        {
          headers: baseHeaders,
          next: { revalidate: 60 },
          signal: controller2.signal,
        }
      );

      clearTimeout(timer2);

      if (res2.ok) {
        const data2 = await res2.json();
        const chain2 = data2?.optionChain?.result?.[0];
        optionsData = chain2?.options || [];
      } else {
        optionsData = chain.options || [];
      }
    } else {
      optionsData = chain.options || [];
    }

    // Step 3: Normalize all contracts into PolygonOptionContract format
    const normalized: PolygonOptionContract[] = [];

    for (const expiry of optionsData) {
      for (const call of expiry.calls || []) {
        if (!call.lastPrice && !call.bid && !call.ask) continue;
        if (!call.strike || call.strike <= 0) continue;
        normalized.push(normalizeYahooContract(call, "call"));
      }
      for (const put of expiry.puts || []) {
        if (!put.lastPrice && !put.bid && !put.ask) continue;
        if (!put.strike || put.strike <= 0) continue;
        normalized.push(normalizeYahooContract(put, "put"));
      }
    }

    return {
      results: normalized,
      source: "yahoo-options",
      underlyingPrice: underlyingPrice ? Number(underlyingPrice) : null,
    };
  } catch {
    return emptyOptions("yahoo-options-error");
  }
}

// ─── Finnhub Options Chain ───────────────────────────────────────────────────
// Note: Finnhub free plan does NOT include options data.
// This function is kept for users with premium Finnhub keys.

type FinnhubOptionContract = {
  symbol?: string;
  strike?: number;
  last?: number;
  bid?: number;
  ask?: number;
  volume?: number;
  openInterest?: number;
  impliedVolatility?: number;
};

type FinnhubOptionExpiry = {
  expirationDate?: string;   // "YYYY-MM-DD"
  options?: {
    CALL?: FinnhubOptionContract[];
    PUT?: FinnhubOptionContract[];
  };
};

/**
 * Fetch real options chain from Finnhub (requires premium key).
 * Returns contracts normalized into PolygonOptionContract[] format.
 */
export async function fetchFinnhubOptions(
  symbol: string,
  apiKey: string
): Promise<YahooOptionsResult> {
  const url = `https://finnhub.io/api/v1/stock/option-chain?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPTIONS_FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) return emptyOptions("finnhub-options-error");

    const data = await res.json();

    // Finnhub returns error object for free plans
    if (data?.error) return emptyOptions("finnhub-options-no-access");

    const expirations: FinnhubOptionExpiry[] = data?.data || [];

    if (!expirations.length) return emptyOptions("finnhub-options-no-data");

    // Find the expiration closest to 30 DTE
    const now = Date.now();
    const targetMs = now + 30 * 86_400_000;

    let bestExpiry = expirations[0];
    let bestDist = Infinity;

    for (const exp of expirations) {
      if (!exp.expirationDate) continue;
      const expMs = new Date(`${exp.expirationDate}T00:00:00Z`).getTime();
      const dist = Math.abs(expMs - targetMs);
      if (dist < bestDist) {
        bestDist = dist;
        bestExpiry = exp;
      }
    }

    const calls = bestExpiry.options?.CALL || [];
    const puts = bestExpiry.options?.PUT || [];
    const normalized: PolygonOptionContract[] = [];

    for (const call of calls) {
      if (!call.last && !call.bid && !call.ask) continue;
      if (!call.strike || call.strike <= 0) continue;

      const bid = Number(call.bid || 0);
      const ask = Number(call.ask || 0);
      const midpoint = bid > 0 && ask > 0 ? (bid + ask) / 2 : undefined;

      normalized.push({
        details: {
          contract_type: "call",
          strike_price: Number(call.strike),
          expiration_date: bestExpiry.expirationDate,
        },
        implied_volatility: Number(call.impliedVolatility || 0),
        last_quote: { midpoint: midpoint ?? Number(call.last || 0) },
        last_trade: { price: Number(call.last || 0) },
        day: { volume: Number(call.volume || 0) },
        open_interest: Number(call.openInterest || 0),
        greeks: undefined,
      });
    }

    for (const put of puts) {
      if (!put.last && !put.bid && !put.ask) continue;
      if (!put.strike || put.strike <= 0) continue;

      const bid = Number(put.bid || 0);
      const ask = Number(put.ask || 0);
      const midpoint = bid > 0 && ask > 0 ? (bid + ask) / 2 : undefined;

      normalized.push({
        details: {
          contract_type: "put",
          strike_price: Number(put.strike),
          expiration_date: bestExpiry.expirationDate,
        },
        implied_volatility: Number(put.impliedVolatility || 0),
        last_quote: { midpoint: midpoint ?? Number(put.last || 0) },
        last_trade: { price: Number(put.last || 0) },
        day: { volume: Number(put.volume || 0) },
        open_interest: Number(put.openInterest || 0),
        greeks: undefined,
      });
    }

    return {
      results: normalized,
      source: "finnhub-options",
      underlyingPrice: null,
    };
  } catch {
    return emptyOptions("finnhub-options-error");
  }
}
