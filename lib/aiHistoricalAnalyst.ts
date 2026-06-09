import { macroScore } from "@/lib/macroIntelligence";
import type { TerminalOption } from "@/lib/workstation";

export type AnalystVerdict = {
  stance: "Aggressive Bullish" | "Bullish" | "Neutral" | "Defensive" | "Bearish";
  action: "BUY CALL" | "SELL CALL" | "BUY PUT" | "SELL PUT" | "WATCH" | "AVOID";
  confidence: number;
  summary: string;
  reasons: string[];
  risks: string[];
  checklist: string[];
};

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function analyzeHistorically(option: TerminalOption): AnalystVerdict {
  const historical = option.historical;
  const macro = macroScore(option);
  const ivHvSpread = option.iv - historical.realizedVol30;
  const trendScore =
    historical.trend === "Uptrend" ? 18 : historical.trend === "Downtrend" ? -16 : 0;
  const momentumScore = historical.momentum30 > 0 ? 8 : historical.momentum30 < 0 ? -8 : 0;
  const volatilityScore = ivHvSpread < -0.05 ? 12 : ivHvSpread > 0.12 ? -10 : 3;
  const drawdownScore =
    historical.maxDrawdown < -0.35 ? -16 : historical.maxDrawdown < -0.22 ? -9 : 4;
  const optionScore = option.signal.score - 50;
  const macroPenalty = macro.riskScore >= 80 ? -14 : macro.riskScore >= 65 ? -8 : 0;
  const total = 50 + trendScore + momentumScore + volatilityScore + drawdownScore + optionScore + macroPenalty;
  const confidence = Math.max(0, Math.min(100, Math.round(total)));

  let stance: AnalystVerdict["stance"] = "Neutral";
  if (confidence >= 82) stance = "Aggressive Bullish";
  else if (confidence >= 68) stance = "Bullish";
  else if (confidence <= 30) stance = "Bearish";
  else if (confidence <= 45) stance = "Defensive";

  const expensiveVol = option.iv > historical.realizedVol30 * 1.35 && option.iv > 0.35;
  const cheapVol = option.iv < historical.realizedVol30 * 0.85 || option.iv < 0.28;
  const highMacroRisk = macro.riskScore >= 75;

  let action: AnalystVerdict["action"] = "WATCH";
  if (stance === "Aggressive Bullish" && cheapVol) action = "BUY CALL";
  else if ((stance === "Bullish" || stance === "Aggressive Bullish") && expensiveVol) action = "SELL PUT";
  else if (stance === "Bullish") action = "BUY CALL";
  else if (stance === "Bearish" && cheapVol) action = "BUY PUT";
  else if (stance === "Bearish" && expensiveVol) action = "SELL CALL";
  else if (stance === "Defensive" && expensiveVol) action = "SELL CALL";
  else if (stance === "Defensive" || highMacroRisk) action = "AVOID";

  const reasons = [
    `${historical.trend} regime with 30D momentum at ${pct(historical.momentum30)} and 90D momentum at ${pct(historical.momentum90)}.`,
    `30D historical volatility is ${pct(historical.realizedVol30)} versus option IV at ${pct(option.iv)}.`,
    `Model edge versus fair value is ${option.edge.toFixed(1)}%, while the AI options score is ${option.signal.score}/100.`,
    `Macro risk is ${macro.riskScore}/100, so suggested position scale is ${macro.positionScale}.`
  ];

  const risks = [
    `Historical max drawdown is ${pct(historical.maxDrawdown)}, so downside gaps must be sized conservatively.`,
    `Daily 95% VaR is around ${pct(historical.var95Daily)}, based on the available return history.`,
    option.theta < -0.05
      ? `Theta decay is elevated at ${option.theta.toFixed(3)}, so time risk matters.`
      : `Theta decay is contained at ${option.theta.toFixed(3)}, but it still compounds every day.`
  ];

  const checklist = [
    "Confirm the next earnings date before entering.",
    "Avoid full size when macro risk is above 65.",
    "Prefer defined-risk structures when IV is above historical volatility.",
    "Recheck the signal after the next daily close."
  ];

  const summary =
    `${option.symbol} is classified as ${stance.toLowerCase()} with ${confidence}/100 confidence. ` +
    `The model favors ${action} because historical trend, IV/HV, drawdown, macro pressure, and options edge are aligned at this level.`;

  return {
    stance,
    action,
    confidence,
    summary,
    reasons,
    risks,
    checklist
  };
}
