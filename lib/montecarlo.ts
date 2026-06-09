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

export function monteCarlo(
  S: number,
  sigma: number,
  r = 0.05,
  days = 30,
  simulations = 2000,
  seed?: number
) {
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

  return {
    avg,
    bullish: (results.filter((result) => result > S).length / results.length) * 100,
    bearish: (results.filter((result) => result < S).length / results.length) * 100,
    expectedReturn: ((avg - S) / Math.max(S, 1)) * 100,
    var5: sorted[Math.floor(sorted.length * 0.05)],
    p95: sorted[Math.floor(sorted.length * 0.95)]
  };
}
