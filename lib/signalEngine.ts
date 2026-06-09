export type OptionInput = {
  delta: number;
  gamma: number;
  theta: number;
  iv: number;
  volume?: number;
  openInterest?: number;
  type: "call" | "put";
};

export function signalEngine(opt: OptionInput) {
  let score = 50;

  // Delta scoring — ATM options with |delta| >= 0.4 are the most actionable
  if (Math.abs(opt.delta) >= 0.4) score += 16;
  else if (Math.abs(opt.delta) >= 0.25) score += 8;

  // Gamma scoring — positive gamma is good for buyers
  if (opt.gamma > 0.03) score += 10;
  else if (opt.gamma > 0.015) score += 5;

  // IV scoring — moderate IV is ideal; very low = cheap entry, very high = expensive
  if (opt.iv < 0.25) score += 14;
  else if (opt.iv < 0.4) score += 8;
  else if (opt.iv < 0.6) score += 0;
  else if (opt.iv > 0.8) score -= 12;
  else if (opt.iv > 0.65) score -= 6;

  // Theta — moderate theta is fine, extreme theta hurts
  if (opt.theta < -0.10) score -= 8;
  else if (opt.theta < -0.05) score -= 3;

  // Volume/OI — strong activity is a positive signal
  if ((opt.volume || 0) > (opt.openInterest || 1) * 0.8) score += 10;
  if ((opt.volume || 0) > 100) score += 5;
  if ((opt.openInterest || 0) > 500) score += 3;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let signal: "BUY CALL" | "SELL CALL" | "BUY PUT" | "SELL PUT" | "WATCH" | "AVOID" = "WATCH";
  if (score >= 65 && opt.delta > 0 && opt.iv <= 0.55) signal = "BUY CALL";
  if (score >= 65 && opt.delta > 0 && opt.iv > 0.55) signal = "SELL PUT";
  if (score >= 65 && opt.delta < 0 && opt.iv <= 0.55) signal = "BUY PUT";
  if (score >= 65 && opt.delta < 0 && opt.iv > 0.55) signal = "SELL CALL";
  if (score <= 30 && opt.iv > 0.65) signal = opt.delta > 0 ? "SELL CALL" : "SELL PUT";

  const confidence =
    score >= 75 ? "High" : score >= 60 ? "Medium" : score <= 30 ? "Defensive" : "Low";

  return {
    score,
    signal,
    confidence
  };
}
