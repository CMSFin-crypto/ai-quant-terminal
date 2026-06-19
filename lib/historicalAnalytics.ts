import { getRefPrice } from "@/lib/sectors";

export type PriceBar = {
  t: number;
  c: number;
  h?: number;
  l?: number;
  o?: number;
  v?: number;
};

export type HistoricalMetrics = {
  spot: number;
  realizedVol30: number;
  realizedVol90: number;
  /** 10-day realized volatility */
  realizedVol10: number;
  /** 20-day realized volatility */
  realizedVol20: number;
  /** 60-day realized volatility */
  realizedVol60: number;
  /** 52-week high of rolling 20-day HV — used as IV Rank denominator */
  hvHigh52w: number;
  /** 52-week low of rolling 20-day HV — used as IV Rank denominator */
  hvLow52w: number;
  /** Per-day rolling 20-day HV over the past year, used for IV Percentile */
  hvSeries: number[];
  momentum30: number;
  momentum90: number;
  maxDrawdown: number;
  /** 95% Value-at-Risk (daily) — positive number representing the 5th-percentile loss. */
  var95: number;
  trend: "Uptrend" | "Downtrend" | "Range";
  confidenceBoost: number;
};

function stdev(values: number[]) {
  if (values.length < 2) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function returnsFromBars(bars: PriceBar[]) {
  return bars
    .slice(1)
    .map((bar, index) => Math.log(bar.c / bars[index].c))
    .filter(Number.isFinite);
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p)))];
}

function maxDrawdown(closes: number[]) {
  let peak = closes[0] || 0;
  let drawdown = 0;

  for (const close of closes) {
    peak = Math.max(peak, close);
    drawdown = Math.min(drawdown, (close - peak) / Math.max(peak, 1));
  }

  return drawdown;
}

function momentum(closes: number[], days: number) {
  if (closes.length <= days) return 0;
  const now = closes[closes.length - 1];
  const then = closes[closes.length - 1 - days];
  return (now - then) / Math.max(then, 1);
}

export function calculateHistoricalMetrics(bars: PriceBar[]): HistoricalMetrics {
  const cleanBars = bars.filter((bar) => Number.isFinite(bar.c) && bar.c > 0);
  const closes = cleanBars.map((bar) => bar.c);
  const returns = returnsFromBars(cleanBars);
  const lastClose = closes[closes.length - 1] || 100;

  // Rolling-window HV: 10, 20, 30, 60, 90 day windows
  const hv = (window: number) => {
    const slice = returns.slice(-window);
    return stdev(slice) * Math.sqrt(252);
  };
  const realizedVol10 = hv(10);
  const realizedVol20 = hv(20);
  const realizedVol30 = hv(30);
  const realizedVol60 = hv(60);
  const realizedVol90 = hv(90);

  // Build a per-day rolling 20-day HV series over the past year (for IV Percentile & IV Rank)
  // We compute HV at each day using the prior 20 returns — this gives ~230 data points
  const ROLLING_WINDOW = 20;
  const hvSeries: number[] = [];
  for (let i = ROLLING_WINDOW; i <= returns.length; i++) {
    const slice = returns.slice(i - ROLLING_WINDOW, i);
    hvSeries.push(stdev(slice) * Math.sqrt(252));
  }
  const hvHigh52w = hvSeries.length ? Math.max(...hvSeries) : realizedVol30;
  const hvLow52w = hvSeries.length ? Math.min(...hvSeries) : realizedVol30;

  const momentum30 = momentum(closes, 30);
  const momentum90 = momentum(closes, 90);
  const maxDd = maxDrawdown(closes);
  // 95% VaR: the loss at the 5th percentile, reported as a positive number
  const var95 = -percentile(returns, 0.05);

  let trend: HistoricalMetrics["trend"] = "Range";
  if (momentum30 > 0.04 && momentum90 > 0.02) trend = "Uptrend";
  if (momentum30 < -0.04 && momentum90 < -0.02) trend = "Downtrend";

  const confidenceBoost =
    trend === "Uptrend"
      ? 8
      : trend === "Downtrend"
        ? 6
        : Math.abs(momentum30) < 0.015
          ? -3
          : 0;

  return {
    spot: lastClose,
    realizedVol10,
    realizedVol20,
    realizedVol30,
    realizedVol60,
    realizedVol90,
    hvHigh52w,
    hvLow52w,
    hvSeries,
    momentum30,
    momentum90,
    maxDrawdown: maxDd,
    var95,
    trend,
    confidenceBoost
  };
}

/**
 * IV Rank (IVR) — where current IV sits within its 52-week range
 *   IVR = (currentIV - 52w low) / (52w high - 52w low) × 100
 * Range: 0 (IV at year low) to 100 (IV at year high)
 */
export function calculateIVRank(currentIV: number, hvHigh52w: number, hvLow52w: number): number {
  const range = hvHigh52w - hvLow52w;
  if (range < 0.001) return 50; // flat vol regime → neutral
  const rank = ((currentIV - hvLow52w) / range) * 100;
  return Math.max(0, Math.min(100, Math.round(rank * 10) / 10));
}

/**
 * IV Percentile (IVP) — % of days in past year where HV was BELOW current IV
 *   IVP = (count of days where HV < currentIV) / totalDays × 100
 * Range: 0 (IV cheaper than 100% of year) to 100 (IV more expensive than 100% of year)
 *
 * IVP > 50 → options expensive → consider selling premium
 * IVP < 30 → options cheap → consider buying premium
 */
export function calculateIVPercentile(currentIV: number, hvSeries: number[]): number {
  if (!hvSeries.length) return 50;
  const below = hvSeries.filter(hv => hv < currentIV).length;
  return Math.round((below / hvSeries.length) * 1000) / 10;
}

export function generateMockHistory(symbol: string, days = 252): PriceBar[] {
  // Use reference prices to generate realistic mock data
  const refPrice = getRefPrice(symbol);

  const seed = symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const bars: PriceBar[] = [];
  // Use reference price if available, otherwise fall back to hash-based price
  let price = refPrice || (60 + (seed % 260));
  let state = seed || 1;
  const annualVol = 0.24 + (seed % 28) / 100;
  const drift = ((seed % 11) - 4) / 100_000;

  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  const normalShock = () => {
    const u1 = Math.max(random(), Number.EPSILON);
    const u2 = random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  // Start from ~15% lower than ref price and drift upward to current level
  // This creates a realistic-looking price path ending near the reference price
  const startPrice = price * 0.87;
  price = startPrice;

  for (let index = days; index >= 0; index--) {
    const dt = 1 / 252;
    // Add slight upward drift to reach refPrice by the end
    const driftToTarget = refPrice ? Math.log(price / (refPrice * 0.87)) / (days * dt) * 0.15 : 0;
    const shock = annualVol * Math.sqrt(dt) * normalShock();
    price = Math.max(5, price * Math.exp((drift + driftToTarget - 0.5 * annualVol ** 2) * dt + shock));
    bars.push({
      t: Date.now() - index * 86_400_000,
      c: Number(price.toFixed(2))
    });
  }

  // Snap the final price to the reference price (±2% random variation)
  // This ensures the "current" price shown in the terminal is realistic
  if (refPrice && bars.length > 0) {
    const variation = 0.98 + (seed % 5) / 100; // 0.98 - 1.02
    const finalPrice = Number((refPrice * variation).toFixed(2));
    bars[bars.length - 1].c = finalPrice;
    // Also adjust the last 5 bars to smooth the transition
    const smoothBars = Math.min(5, bars.length);
    for (let i = 1; i <= smoothBars; i++) {
      const idx = bars.length - 1 - i;
      if (idx >= 0) {
        const weight = i / (smoothBars + 1);
        bars[idx].c = Number((bars[idx].c * (1 - weight) + finalPrice * weight).toFixed(2));
      }
    }
  }

  return bars;
}
