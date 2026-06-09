function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const value = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * value);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-value * value));

  return sign * y;
}

function normalCDF(x: number): number {
  return (1 - erf(-x / Math.sqrt(2))) / 2;
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function dValues(S: number, K: number, T: number, r: number, sigma: number) {
  const safeS = Math.max(S, 0.01);
  const safeK = Math.max(K, 0.01);
  const safeSigma = Math.max(sigma, 0.01);
  const safeT = Math.max(T, 1 / 365);
  const d1 =
    (Math.log(safeS / safeK) + (r + safeSigma * safeSigma * 0.5) * safeT) /
    (safeSigma * Math.sqrt(safeT));

  return {
    d1,
    d2: d1 - safeSigma * Math.sqrt(safeT),
    safeS,
    safeK,
    safeSigma,
    safeT
  };
}

export function blackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: "call" | "put"
) {
  const { d1, d2, safeS, safeK, safeT } = dValues(S, K, T, r, sigma);

  if (type === "call") {
    return safeS * normalCDF(d1) - safeK * Math.exp(-r * safeT) * normalCDF(d2);
  }

  return safeK * Math.exp(-r * safeT) * normalCDF(-d2) - safeS * normalCDF(-d1);
}

export type BlackScholesGreeks = {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
};

export function blackScholesGreeks(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: "call" | "put"
): BlackScholesGreeks {
  const { d1, d2, safeS, safeK, safeSigma, safeT } = dValues(S, K, T, r, sigma);
  const pdf = normalPDF(d1);
  const sqrtT = Math.sqrt(safeT);

  const delta = type === "call" ? normalCDF(d1) : normalCDF(d1) - 1;
  const gamma = pdf / (safeS * safeSigma * sqrtT);

  // Vega: sensitivity to 1% change in implied volatility (per 1% move)
  const vega = (safeS * pdf * sqrtT) / 100;

  const thetaCall =
    (-(safeS * pdf * safeSigma) / (2 * sqrtT) -
      r * safeK * Math.exp(-r * safeT) * normalCDF(d2)) /
    365;
  const thetaPut =
    (-(safeS * pdf * safeSigma) / (2 * sqrtT) +
      r * safeK * Math.exp(-r * safeT) * normalCDF(-d2)) /
    365;

  // Rho: sensitivity to 1% change in risk-free rate (per 1% move)
  const rhoCall =
    safeK * Math.exp(-r * safeT) * normalCDF(d2) * safeT / 100;
  const rhoPut =
    -safeK * Math.exp(-r * safeT) * normalCDF(-d2) * safeT / 100;

  return {
    delta,
    gamma,
    theta: type === "call" ? thetaCall : thetaPut,
    vega,
    rho: type === "call" ? rhoCall : rhoPut
  };
}

/**
 * Solve for implied volatility using Newton-Raphson method.
 * Given market price, find the σ that makes BS(S,K,T,r,σ,type) = marketPrice.
 * This gives us the "true" IV consistent with the actual market price.
 */
export function impliedVolatility(
  S: number,
  K: number,
  T: number,
  r: number,
  marketPrice: number,
  type: "call" | "put",
  initialSigma = 0.3,
  maxIter = 50,
  tolerance = 0.0001
): number {
  // Lower bound: intrinsic value
  const intrinsic = type === "call"
    ? Math.max(S - K * Math.exp(-r * T), 0)
    : Math.max(K * Math.exp(-r * T) - S, 0);

  if (marketPrice <= intrinsic + 0.01) {
    // Option is at intrinsic — IV is near zero, return small value
    return 0.05;
  }

  let sigma = Math.max(initialSigma, 0.05);
  const sqrtT = Math.sqrt(Math.max(T, 1 / 365));

  for (let i = 0; i < maxIter; i++) {
    const price = blackScholes(S, K, T, r, sigma, type);
    const diff = price - marketPrice;

    if (Math.abs(diff) < tolerance) {
      return sigma;
    }

    // Vega = S * N'(d1) * sqrt(T) — not divided by 100 here
    const { d1, safeS, safeSigma } = dValues(S, K, T, r, sigma);
    const vega = safeS * normalPDF(d1) * sqrtT;

    if (vega < 1e-10) {
      // Vega too small — avoid division by zero
      break;
    }

    sigma = sigma - diff / vega;

    // Keep sigma in reasonable bounds
    if (sigma < 0.01) sigma = 0.01;
    if (sigma > 5.0) sigma = 5.0;
  }

  return sigma;
}
