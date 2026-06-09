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

  if (Math.abs(opt.delta) > 0.5) score += 18;
  if (opt.gamma > 0.04) score += 10;
  if (opt.iv < 0.3) score += 14;
  if (opt.iv > 0.7) score -= 16;
  if (opt.theta < -0.05) score -= 10;
  if ((opt.volume || 0) > (opt.openInterest || 1) * 0.8) score += 12;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let signal: "BUY CALL" | "SELL CALL" | "BUY PUT" | "SELL PUT" | "WATCH" | "AVOID" = "WATCH";
  if (score >= 78 && opt.delta > 0 && opt.iv <= 0.55) signal = "BUY CALL";
  if (score >= 78 && opt.delta > 0 && opt.iv > 0.55) signal = "SELL PUT";
  if (score >= 78 && opt.delta < 0 && opt.iv <= 0.55) signal = "BUY PUT";
  if (score >= 78 && opt.delta < 0 && opt.iv > 0.55) signal = "SELL CALL";
  if (score <= 35 && opt.iv > 0.65) signal = opt.delta > 0 ? "SELL CALL" : "SELL PUT";

  const confidence =
    score >= 82 ? "High" : score >= 68 ? "Medium" : score <= 35 ? "Defensive" : "Low";

  return {
    score,
    signal,
    confidence
  };
}
