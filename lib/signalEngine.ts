/**
 * Signal Engine v2 — DTE-aware, IV-correct, with POP/breakeven/R/R computation.
 *
 * KEY FIXES vs v1:
 * 1. IV logic inversion bug fixed:
 *    - High IV + Call (delta>0) → SELL CALL (was SELL PUT — wrong!)
 *    - High IV + Put  (delta<0) → SELL PUT  (was SELL CALL — wrong!)
 *    Rationale: High IV → premiums expensive → SELL premium to collect & benefit from IV crush.
 *
 * 2. Theta is now DTE-aware:
 *    - Raw theta ($/day) is meaningless across different expiries.
 *    - We use dailyDecayPct = |theta| / price × 100 (% of premium lost per day).
 *    - >3%/day = catastrophic (typical for <7 DTE ATM); <0.5%/day = normal (>45 DTE).
 *
 * 3. Added context: spot, strike, price, dte → can now compute POP, breakeven, max loss/gain, R/R.
 *
 * 4. Added warnings: gamma risk (≤7 DTE), IV crush risk (≤14 DTE + high IV),
 *    capital inefficiency (>90 DTE + low IV).
 */

export type OptionInput = {
  delta: number;
  gamma: number;
  theta: number;
  iv: number;
  volume?: number;
  openInterest?: number;
  type: "call" | "put";
  // NEW — context for accurate scoring & risk metrics
  dte?: number;
  spot?: number;
  strike?: number;
  price?: number;
  riskFreeRate?: number;
};

export type SignalWarning = string;

export type SignalResult = {
  score: number;
  signal: "BUY CALL" | "SELL CALL" | "BUY PUT" | "SELL PUT" | "WATCH" | "AVOID";
  confidence: "High" | "Medium" | "Low" | "Defensive";
  // NEW computed metrics
  pop: number;              // Probability of Profit (buyer's view, %) — based on |delta|
  breakeven: number;        // Breakeven underlying price ($)
  dailyDecayPct: number;    // |theta|/price × 100 — % of premium lost per day
  maxLoss: number;          // Max loss for long position (1 contract, $)
  maxProfit: number;        // Approx max profit for long position (1 contract, $)
  riskReward: number;       // R/R ratio (e.g., 2.5 = 2.5:1)
  dte: number;
  warnings: SignalWarning[];
};

export function signalEngine(opt: OptionInput): SignalResult {
  const dte = Math.max(1, Math.round(opt.dte || 30));
  const price = opt.price || 0;
  const spot = opt.spot || 0;
  const strike = opt.strike || 0;

  let score = 50;

  // === Delta scoring — ATM options with |delta| >= 0.4 are the most actionable ===
  if (Math.abs(opt.delta) >= 0.4) score += 16;
  else if (Math.abs(opt.delta) >= 0.25) score += 8;

  // === Gamma scoring — positive gamma is good for buyers ===
  if (opt.gamma > 0.03) score += 10;
  else if (opt.gamma > 0.015) score += 5;

  // === IV scoring — moderate IV is ideal; very low = cheap entry, very high = expensive ===
  if (opt.iv < 0.25) score += 14;
  else if (opt.iv < 0.4) score += 8;
  else if (opt.iv < 0.6) score += 0;
  else if (opt.iv > 0.8) score -= 12;
  else if (opt.iv > 0.65) score -= 6;

  // === THETA NORMALIZED BY DTE ===
  // theta is in $/day. Raw value is misleading:
  //   - 7-DTE option with theta=-0.10 is catastrophic
  //   - 90-DTE option with theta=-0.10 is normal
  // Solution: use % of premium lost per day = |theta| / price × 100
  //   - >3%/day = catastrophic (typical for <7 DTE ATM)
  //   - 1.5-3%/day = high (typical for 7-14 DTE)
  //   - 0.7-1.5%/day = moderate (typical for 14-45 DTE)
  //   - <0.7%/day = low (typical for >45 DTE)
  let dailyDecayPct = 0;
  if (price > 0) {
    dailyDecayPct = Math.abs(opt.theta) / price * 100;
    if (dailyDecayPct > 3) score -= 12;        // >3%/day = catastrophic
    else if (dailyDecayPct > 1.5) score -= 6;  // 1.5-3%/day = high
    else if (dailyDecayPct > 0.7) score -= 2;  // 0.7-1.5%/day = moderate
  } else {
    // Fallback to raw theta if no price available (legacy behavior)
    if (opt.theta < -0.10) score -= 8;
    else if (opt.theta < -0.05) score -= 3;
  }

  // === Volume/OI — strong activity is a positive signal ===
  if ((opt.volume || 0) > (opt.openInterest || 1) * 0.8) score += 10;
  if ((opt.volume || 0) > 100) score += 5;
  if ((opt.openInterest || 0) > 500) score += 3;

  score = Math.max(0, Math.min(100, Math.round(score)));

  // === FIXED SIGNAL LOGIC ===
  // Industry-standard options logic:
  //   High IV (>0.55) → options expensive → SELL premium (collect & benefit from IV crush)
  //     CALL (delta>0) + high IV → SELL CALL (covered call strategy)
  //     PUT  (delta<0) + high IV → SELL PUT  (cash-secured put strategy)
  //   Low IV (<=0.55) → options cheap → BUY premium (cheap entry, expect IV to rise)
  //     CALL (delta>0) + low IV → BUY CALL
  //     PUT  (delta<0) + low IV → BUY PUT
  let signal: "BUY CALL" | "SELL CALL" | "BUY PUT" | "SELL PUT" | "WATCH" | "AVOID" = "WATCH";
  if (score >= 65 && opt.delta > 0 && opt.iv <= 0.55) signal = "BUY CALL";
  if (score >= 65 && opt.delta > 0 && opt.iv > 0.55) signal = "SELL CALL";   // FIXED: was SELL PUT
  if (score >= 65 && opt.delta < 0 && opt.iv <= 0.55) signal = "BUY PUT";
  if (score >= 65 && opt.delta < 0 && opt.iv > 0.55) signal = "SELL PUT";    // FIXED: was SELL CALL
  // Defensive: low score + high IV → still sell premium (income play)
  if (score <= 30 && opt.iv > 0.65) signal = opt.delta > 0 ? "SELL CALL" : "SELL PUT";

  const confidence: SignalResult["confidence"] =
    score >= 75 ? "High" : score >= 60 ? "Medium" : score <= 30 ? "Defensive" : "Low";

  // === Computed metrics (POP, breakeven, max loss/gain, R/R) ===
  // POP approximation using |delta| — industry-standard proxy:
  // |delta| ≈ N(d2) ≈ probability of finishing ITM
  // For BUYER: POP = |delta| (option expires ITM = profit)
  // For SELLER: POP = 1 - |delta| (option expires OTM = profit)
  const pop = Math.round(Math.abs(opt.delta) * 1000) / 10;  // 1 decimal place

  // Breakeven — IBKR-style
  const breakeven = strike > 0
    ? (opt.type === "call" ? strike + price : strike - price)
    : 0;

  // Max loss / Max profit (single-leg LONG position, 1 contract = 100 shares)
  // Long Call: max loss = premium × 100, max profit ≈ unlimited (we approximate with +50% spot move)
  // Long Put:  max loss = premium × 100, max profit = (strike - premium) × 100 (if spot → 0)
  const maxLoss = Math.round(price * 100);
  let maxProfit = 0;
  if (opt.type === "call") {
    // Approximate: assume stock can rise ~50% (conservative ceiling)
    maxProfit = spot > 0 ? Math.round((spot * 1.5 - strike - price) * 100) : 0;
  } else {
    maxProfit = strike > 0 ? Math.round((strike - price) * 100) : 0;
  }
  const riskReward = maxLoss > 0 ? Math.round((maxProfit / maxLoss) * 10) / 10 : 0;

  // === Warnings — context-aware risk flags ===
  const warnings: SignalWarning[] = [];
  if (dte <= 7 && dailyDecayPct > 2) {
    warnings.push(
      `Gamma risk: ${dte} DTE me ${dailyDecayPct.toFixed(1)}%/ditë decay — ` +
      `opsioni mund të humbasë vlerë shumë shpejt. Largohu ose përdor spread.`
    );
  }
  if (dte <= 14 && opt.iv > 0.6) {
    warnings.push(
      `IV crush risk: ${dte} DTE + IV>${(opt.iv * 100).toFixed(0)}% — ` +
      `IV mund të bjerë drastikisht pas eventit (earnings?). Konsidero spread për të mbrojtur.`
    );
  }
  if (dte > 90 && opt.iv < 0.25) {
    warnings.push(
      `Capital inefficient: ${dte} DTE + IV e ulët — kapitali bllokohet për muaj ` +
      `me kthim të ulët. Konsidero afat më të shkurtër ose debit spread.`
    );
  }
  if (price > 0 && Math.abs(opt.theta) / price > 0.05) {
    warnings.push(
      `Theta alarm: opsioni humbet ${(dailyDecayPct).toFixed(1)}% të premium-it çdo ditë — ` +
      `koha po të punon kundër.`
    );
  }

  return {
    score,
    signal,
    confidence,
    pop,
    breakeven,
    dailyDecayPct,
    maxLoss,
    maxProfit,
    riskReward,
    dte,
    warnings
  };
}
