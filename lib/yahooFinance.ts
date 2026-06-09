/**
 * Yahoo Finance free data source — no API key required.
 * Uses the v8 chart endpoint which returns both historical candles and current quote.
 * Uses the v7 options endpoint for real options chain data with IV and Greeks.
 *
 * All fetch calls include an AbortController timeout to prevent hanging.
 */

import type { PolygonOptionContract } from "./workstation";

const YAHUA_FETCH_TIMEOUT_MS = 8_000;
const OPTIONS_FETCH_TIMEOUT_MS = 10_000;

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

// ─── Yahoo Finance Options Chain ─────────────────────────────────────────────

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
  // Derive expiration date from the contract symbol or timestamp
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

/**
 * Fetch real options chain from Yahoo Finance v7 endpoint.
 * Tries the ~30 DTE expiration first; if none is available falls back to
 * the nearest available expiry.
 *
 * Returns contracts normalized into PolygonOptionContract[] format.
 */
export async function fetchYahooOptions(symbol: string): Promise<YahooOptionsResult> {
  // Step 1: Fetch the default page (nearest expiry) to get the list of all expirations
  const baseUrl = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`;

  try {
    const controller1 = new AbortController();
    const timer1 = setTimeout(() => controller1.abort(), OPTIONS_FETCH_TIMEOUT_MS);

    const res1 = await fetch(baseUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 60 },
      signal: controller1.signal,
    });

    clearTimeout(timer1);

    if (!res1.ok) return emptyOptions("yahoo-options-error");

    const data1 = await res1.json();
    const chain = data1?.optionChain?.result?.[0];

    if (!chain) return emptyOptions("yahoo-options-no-data");

    const allExpirations: number[] = chain.expirationDates || [];
    const underlyingPrice = chain.quote?.regularMarketPrice ?? null;

    // Step 2: If we already have the ~30 DTE data in the first response, use it
    // Otherwise, fetch the specific expiration date closest to 30 DTE
    let optionsData: YahooOptionsExpiry[];

    // Check if the default response already contains a near-30DTE expiry
    const defaultExpiry = chain.options?.[0]?.expirationDate;
    const targetExpiry = pickClosestExpiry(allExpirations, 30);

    if (defaultExpiry && targetExpiry && Math.abs(defaultExpiry - targetExpiry) < 3 * 86400) {
      // Close enough – use the data we already have
      optionsData = chain.options || [];
    } else if (targetExpiry) {
      // Fetch the specific ~30 DTE expiry
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), OPTIONS_FETCH_TIMEOUT_MS);

      const res2 = await fetch(`${baseUrl}?date=${targetExpiry}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 },
        signal: controller2.signal,
      });

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
        // Skip contracts with no meaningful data
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
 * Fetch real options chain from Finnhub.
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
        greeks: undefined, // Finnhub doesn't provide greeks; BS model will compute them
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
