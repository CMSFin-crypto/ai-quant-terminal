import { macroScore } from "@/lib/macroIntelligence";
import type { TerminalOption } from "@/lib/workstation";

export type AnalystVerdict = {
  stance: "Aggressive Bullish" | "Bullish" | "Neutral" | "Defensive" | "Bearish";
  action: "BUY CALL" | "SELL CALL" | "BUY PUT" | "SELL PUT" | "WATCH" | "AVOID";
  bias: "Bullish" | "Bearish" | "Neutral";
  structure: string;
  riskLabel: "Low" | "Medium" | "High" | "Very High";
  maxRiskText: string;
  maxRewardText: string;
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
  const dataPenalty = option.dataQuality < 50 ? -24 : option.dataQuality < 70 ? -10 : 0;
  const trendScore =
    historical.trend === "Uptrend" ? 18 : historical.trend === "Downtrend" ? -16 : 0;
  const momentumScore = historical.momentum30 > 0 ? 8 : historical.momentum30 < 0 ? -8 : 0;
  const volatilityScore = ivHvSpread < -0.05 ? 12 : ivHvSpread > 0.12 ? -10 : 3;
  const drawdownScore =
    historical.maxDrawdown < -0.35 ? -16 : historical.maxDrawdown < -0.22 ? -9 : 4;
  const optionScore = option.signal.score - 50;
  const macroPenalty = macro.riskScore >= 80 ? -14 : macro.riskScore >= 65 ? -8 : 0;
  const total = 50 + trendScore + momentumScore + volatilityScore + drawdownScore + optionScore + macroPenalty + dataPenalty;
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
  if (option.dataQuality < 50 || highMacroRisk) action = "AVOID";
  else if (option.dataQuality < 70) action = "WATCH";
  else if (stance === "Aggressive Bullish" && cheapVol) action = "BUY CALL";
  else if ((stance === "Bullish" || stance === "Aggressive Bullish") && expensiveVol) action = "SELL PUT";
  else if (stance === "Bullish") action = "BUY CALL";
  else if (stance === "Bearish" && cheapVol) action = "BUY PUT";
  else if (stance === "Bearish" && expensiveVol) action = "SELL CALL";
  else if (stance === "Defensive" && expensiveVol) action = "SELL CALL";
  else if (stance === "Defensive") action = "AVOID";

  const bias: AnalystVerdict["bias"] =
    action.includes("CALL") && action.startsWith("BUY")
      ? "Bullish"
      : action === "SELL PUT"
        ? "Bullish"
        : action.includes("PUT") && action.startsWith("BUY")
          ? "Bearish"
          : action === "SELL CALL"
            ? "Bearish"
            : "Neutral";

  const structure =
    action === "BUY CALL"
      ? "Long call or call debit spread"
      : action === "SELL PUT"
        ? "Cash-secured put or put credit spread"
        : action === "BUY PUT"
          ? "Long put or put debit spread"
          : action === "SELL CALL"
            ? "Covered call or call credit spread"
            : action === "WATCH"
              ? "No trade yet"
              : "No trade";

  const riskLabel: AnalystVerdict["riskLabel"] =
    option.dataQuality < 60 || macro.riskScore >= 75
      ? "Very High"
      : action.startsWith("SELL")
        ? "High"
        : option.iv > 0.55 || Math.abs(historical.maxDrawdown) > 0.25
          ? "Medium"
          : "Low";

  const maxRiskText =
    action === "BUY CALL" || action === "BUY PUT"
      ? `Premium paid, about $${(option.price * 100).toFixed(0)} per contract.`
      : action === "SELL PUT" || action === "SELL CALL"
        ? "Undefined if naked. Prefer defined-risk spread or covered/cash-secured setup."
        : "No position risk because the model does not recommend entry.";

  const maxRewardText =
    action === "BUY CALL"
      ? "Theoretical upside is high, but probability depends on move size and time decay."
      : action === "BUY PUT"
        ? "Reward rises if the stock falls below strike before expiry."
        : action === "SELL PUT" || action === "SELL CALL"
          ? `Premium income, about $${(option.price * 100).toFixed(0)} per contract before spread caps.`
          : "No reward target until a cleaner setup appears.";

  const reasons = [
    `${historical.trend} regime with 30D momentum at ${pct(historical.momentum30)} and 90D momentum at ${pct(historical.momentum90)}.`,
    `30D historical volatility is ${pct(historical.realizedVol30)} versus option IV at ${pct(option.iv)}.`,
    `Model edge versus fair value is ${option.edge.toFixed(1)}%, while the AI options score is ${option.signal.score}/100.`,
    `Macro risk is ${macro.riskScore}/100, data quality is ${option.dataQuality}/100, and suggested position scale is ${macro.positionScale}.`
  ];

  const risks = [
    `Historical max drawdown is ${pct(historical.maxDrawdown)}, so downside gaps must be sized conservatively.`,
    `Daily 95% VaR is around ${pct(historical.var95)}, based on the available return history.`,
    option.dataSource === "synthetic-options"
      ? "Options data is synthetic, so treat fair value and model price as estimates until a real options feed is connected."
      : "Options data is real from the connected options feed.",
    option.theta < -0.05
      ? `Theta decay is elevated at ${option.theta.toFixed(3)}, so time risk matters.`
      : `Theta decay is contained at ${option.theta.toFixed(3)}, but it still compounds every day.`
  ];

  const checklist = [
    "Confirm the next earnings date before entering.",
    "Use spreads for SELL CALL or SELL PUT unless the position is covered or cash-secured.",
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
    bias,
    structure,
    riskLabel,
    maxRiskText,
    maxRewardText,
    confidence,
    summary,
    reasons,
    risks,
    checklist
  };
}
