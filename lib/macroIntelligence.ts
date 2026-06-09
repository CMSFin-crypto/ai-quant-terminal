import type { Stock } from "@/lib/sectors";
import type { TerminalOption } from "@/lib/workstation";

export type MacroEvent = {
  theme: string;
  source: "White House" | "Federal Reserve" | "Geopolitics" | "Historical Regime";
  impact: "Bullish" | "Bearish" | "Volatile" | "Defensive";
  sectors: Stock["sector"][];
  confidence: number;
  note: string;
};

const sectorSensitivity: Record<Stock["sector"], Record<MacroEvent["source"], number>> = {
  "AI Technology": {
    "White House": 1.15,
    "Federal Reserve": 1.15,
    Geopolitics: 0.9,
    "Historical Regime": 1.1
  },
  Semiconductors: {
    "White House": 1.25,
    "Federal Reserve": 1,
    Geopolitics: 1.35,
    "Historical Regime": 1.25
  },
  Tech: {
    "White House": 0.9,
    "Federal Reserve": 1.1,
    Geopolitics: 0.8,
    "Historical Regime": 1
  },
  Retail: {
    "White House": 1,
    "Federal Reserve": 1,
    Geopolitics: 0.85,
    "Historical Regime": 0.9
  },
  Consumer: {
    "White House": 0.75,
    "Federal Reserve": 0.85,
    Geopolitics: 0.65,
    "Historical Regime": 0.75
  },
  Industrials: {
    "White House": 1,
    "Federal Reserve": 1.05,
    Geopolitics: 0.95,
    "Historical Regime": 0.95
  },
  Finance: {
    "White House": 0.7,
    "Federal Reserve": 1.4,
    Geopolitics: 0.6,
    "Historical Regime": 0.9
  },
  Energy: {
    "White House": 1.1,
    "Federal Reserve": 0.65,
    Geopolitics: 1.45,
    "Historical Regime": 1
  },
  Healthcare: {
    "White House": 1.1,
    "Federal Reserve": 0.5,
    Geopolitics: 0.7,
    "Historical Regime": 0.65
  },
  Defense: {
    "White House": 1.35,
    "Federal Reserve": 0.55,
    Geopolitics: 1.5,
    "Historical Regime": 0.8
  },
  Auto: {
    "White House": 1.2,
    "Federal Reserve": 0.9,
    Geopolitics: 1,
    "Historical Regime": 1.2
  },
  "E-Commerce": {
    "White House": 1,
    "Federal Reserve": 1,
    Geopolitics: 0.9,
    "Historical Regime": 1.1
  }
};

const allSectors: Stock["sector"][] = [
  "AI Technology",
  "Semiconductors",
  "Tech",
  "Retail",
  "Consumer",
  "Industrials",
  "Finance",
  "Energy",
  "Healthcare",
  "Defense",
  "Auto",
  "E-Commerce"
];

export const macroEvents: MacroEvent[] = [
  {
    theme: "U.S. Presidency Policy Risk",
    source: "White House",
    impact: "Volatile",
    sectors: ["AI Technology", "Semiconductors", "Tech", "Retail", "Consumer", "Industrials", "Energy", "Healthcare", "Defense", "Auto", "E-Commerce"],
    confidence: 78,
    note:
      "President Donald J. Trump administration policy headlines can move tariffs, regulation, healthcare pricing, AI, defense, energy, and cross-border supply chains."
  },
  {
    theme: "Rates & Fed Independence",
    source: "Federal Reserve",
    impact: "Volatile",
    sectors: ["Finance", "AI Technology", "Semiconductors", "Tech", "Retail", "Consumer", "Industrials", "E-Commerce"],
    confidence: 82,
    note:
      "Rate-path uncertainty changes discount rates, bank net interest margins, consumer spending, and long-duration equity multiples."
  },
  {
    theme: "Energy, Shipping & Conflict Premium",
    source: "Geopolitics",
    impact: "Defensive",
    sectors: ["Semiconductors", "Auto", "E-Commerce", "Tech", "Energy", "Defense", "Retail", "Consumer", "Industrials"],
    confidence: 74,
    note:
      "Conflict, sanctions, oil shocks, and shipping disruptions usually lift implied volatility and move energy, defense, chips, retail, and margin-sensitive sectors."
  },
  {
    theme: "Historical Volatility Regime",
    source: "Historical Regime",
    impact: "Volatile",
    sectors: allSectors,
    confidence: 71,
    note:
      "The model compares current implied volatility with historical sector stress behavior and adjusts conviction when options look underpriced."
  }
];

export type MacroResult = {
  riskScore: number;
  ivRegime: string;
  positionScale: string;
  events: MacroEvent[];
};

export function macroScore(option: TerminalOption): MacroResult {
  const events = macroEvents.filter((event) => event.sectors.includes(option.sector));
  const weightedRisk =
    events.reduce((sum, event) => {
      // Lower direction multipliers so macro risk doesn't dominate the risk label
      const direction =
        event.impact === "Bullish" ? -0.3 : event.impact === "Bearish" ? 0.5 : event.impact === "Defensive" ? 0.6 : 0.7;
      return sum + event.confidence * sectorSensitivity[option.sector][event.source] * direction;
    }, 0) / Math.max(events.length, 1);

  const ivRegime = option.iv > 0.55 ? "Stress" : option.iv > 0.35 ? "Elevated" : "Calm";
  const historicalPenalty =
    option.historical.maxDrawdown < -0.3 ? 10 : option.historical.maxDrawdown < -0.18 ? 6 : 0;
  const volMismatch =
    option.iv < option.historical.realizedVol30 ? 8 : option.iv > option.historical.realizedVol30 * 1.7 ? -4 : 0;
  const riskScore = Math.max(0, Math.min(100, Math.round(weightedRisk + historicalPenalty + volMismatch)));
  const positionScale = riskScore >= 80 ? "0.35x" : riskScore >= 65 ? "0.50x" : riskScore >= 45 ? "0.75x" : "1.00x";

  return {
    riskScore,
    ivRegime,
    positionScale,
    events
  };
}

export function buildHistoricalStress(option: TerminalOption) {
  const base =
    option.sector === "Healthcare"
      ? 0.7
      : option.sector === "Auto" || option.sector === "Semiconductors"
        ? 1.35
        : option.sector === "Tech" || option.sector === "AI Technology"
          ? 1.2
          : option.sector === "Energy"
            ? 1.1
            : option.sector === "Defense" || option.sector === "Consumer"
              ? 0.8
              : option.sector === "Industrials"
                ? 0.95
              : 1;

  return [
    { regime: "2018 QT", shock: Math.round(-8 * base), vol: Math.round(31 * base) },
    { regime: "2020 Crash", shock: Math.round(-28 * base), vol: Math.round(76 * base) },
    { regime: "2022 Rates", shock: Math.round(-18 * base), vol: Math.round(48 * base) },
    { regime: "2024 AI", shock: Math.round(16 / base), vol: Math.round(36 * base) },
    {
      regime: "Now",
      shock: Math.round(option.historical.momentum30 * 100),
      vol: Math.round(option.historical.realizedVol30 * 100)
    }
  ];
}
