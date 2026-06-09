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
  const r30 = returns.slice(-30);
  const r90 = returns.slice(-90);
  const realizedVol30 = stdev(r30) * Math.sqrt(252);
  const realizedVol90 = stdev(r90) * Math.sqrt(252);
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
    realizedVol30,
    realizedVol90,
    momentum30,
    momentum90,
    maxDrawdown: maxDd,
    var95,
    trend,
    confidenceBoost
  };
}

export function generateMockHistory(symbol: string, days = 252): PriceBar[] {
  const seed = symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const bars: PriceBar[] = [];
  let price = 60 + (seed % 260);
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

  for (let index = days; index >= 0; index--) {
    const dt = 1 / 252;
    const shock = annualVol * Math.sqrt(dt) * normalShock();
    price = Math.max(5, price * Math.exp((drift - 0.5 * annualVol ** 2) * dt + shock));
    bars.push({
      t: Date.now() - index * 86_400_000,
      c: Number(price.toFixed(2))
    });
  }

  return bars;
}
