function seededRandom(seed: number) {
  let state = seed || 1;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function normalShock(random = Math.random) {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export type MonteCarloResult = {
  avg: number;
  bullish: number;
  bearish: number;
  expectedReturn: number;
  var5: number;
  p95: number;
  /** Histogram bins for distribution chart */
  histogram: { bin: string; count: number; pct: number }[];
  /** Key percentile prices */
  percentiles: { p1: number; p5: number; p10: number; p25: number; p50: number; p75: number; p90: number; p95: number; p99: number };
  /** All terminal prices (for advanced analysis) */
  paths: number[];
};

export function monteCarlo(
  S: number,
  sigma: number,
  r = 0.05,
  days = 30,
  simulations = 2000,
  seed?: number
): MonteCarloResult {
  const dt = 1 / 252;
  const safeSigma = Math.max(sigma, 0.01);
  const results: number[] = [];
  const random = seed ? seededRandom(seed) : Math.random;

  for (let i = 0; i < simulations; i++) {
    let price = S;

    for (let j = 0; j < days; j++) {
      price =
        price *
        Math.exp(
            (r - 0.5 * safeSigma ** 2) * dt +
            safeSigma * Math.sqrt(dt) * normalShock(random)
        );
    }

    results.push(price);
  }

  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  const sorted = [...results].sort((a, b) => a - b);

  // Build histogram with ~20 bins
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const binCount = 20;
  const binWidth = (max - min) / binCount || 1;
  const histogram = Array.from({ length: binCount }, (_, i) => {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = results.filter((v) => v >= binStart && v < (i === binCount - 1 ? binEnd + 0.01 : binEnd)).length;
    return {
      bin: `$${binStart.toFixed(0)}`,
      count,
      pct: Number(((count / results.length) * 100).toFixed(1))
    };
  });

  // Key percentiles
  const pct = (p: number) => sorted[Math.floor(sorted.length * p)];
  const percentiles = {
    p1: pct(0.01), p5: pct(0.05), p10: pct(0.10), p25: pct(0.25),
    p50: pct(0.50), p75: pct(0.75), p90: pct(0.90), p95: pct(0.95), p99: pct(0.99)
  };

  return {
    avg,
    bullish: (results.filter((result) => result > S).length / results.length) * 100,
    bearish: (results.filter((result) => result < S).length / results.length) * 100,
    expectedReturn: ((avg - S) / Math.max(S, 1)) * 100,
    var5: sorted[Math.floor(sorted.length * 0.05)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    histogram,
    percentiles,
    paths: results
  };
}
