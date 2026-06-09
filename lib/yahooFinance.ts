/**
 * Yahoo Finance free data source — no API key required.
 * Uses the v8 chart endpoint which returns both historical candles and current quote.
 */

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

/**
 * Fetch current quote from Yahoo Finance.
 * Uses the v8 chart endpoint with a 5-day range to ensure we get the latest price.
 */
export async function fetchYahooQuote(symbol: string): Promise<YahooQuoteResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 30 }
    });

    if (!res.ok) {
      return { price: null, change: 0, changePercent: 0, high: 0, low: 0, open: 0, previousClose: 0, source: "yahoo-error" };
    }

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta?.regularMarketPrice) {
      return { price: null, change: 0, changePercent: 0, high: 0, low: 0, open: 0, previousClose: 0, source: "yahoo-no-data" };
    }

    return {
      price: Number(meta.regularMarketPrice) || null,
      change: Number(meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose || 0)),
      changePercent: Number(((meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice)) / (meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice) * 100).toFixed(2)),
      high: Number(meta.regularMarketDayHigh || 0),
      low: Number(meta.regularMarketDayLow || 0),
      open: Number(meta.regularMarketOpen || 0),
      previousClose: Number(meta.chartPreviousClose || meta.previousClose || 0),
      source: "yahoo"
    };
  } catch {
    return { price: null, change: 0, changePercent: 0, high: 0, low: 0, open: 0, previousClose: 0, source: "yahoo-error" };
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
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 }
    });

    if (!res.ok) {
      return { results: [], source: "yahoo-error" };
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      return { results: [], source: "yahoo-no-data" };
    }

    const timestamps: number[] = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];

    if (!quotes) {
      return { results: [], source: "yahoo-no-quotes" };
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
    return { results: [], source: "yahoo-error" };
  }
}
