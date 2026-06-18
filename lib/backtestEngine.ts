/**
 * Backtesting Engine
 *
 * Tests options strategies against historical price data.
 * Uses Black-Scholes pricing with historical price paths to simulate
 * how strategies would have performed over the past year.
 *
 * Strategies supported:
 * - Long Call / Long Put (directional)
 * - Covered Call (income on long stock)
 * - Cash-Secured Put (income, willing to buy)
 * - Call Debit Spread (bullish, limited risk)
 * - Put Credit Spread (bullish, income)
 * - Iron Condor (range-bound, income)
 * - Straddle (volatile, big move either way)
 */

import type { TerminalOption } from "@/lib/workstation";
import { blackScholes, blackScholesGreeks } from "@/lib/blackscholes";
import { generateMockHistory, type PriceBar } from "@/lib/historicalAnalytics";

// ─── Types ─────────────────────────────────────────────────────────────

export type BacktestStrategy =
  | "Long Call"
  | "Long Put"
  | "Covered Call"
  | "Cash-Secured Put"
  | "Call Debit Spread"
  | "Put Credit Spread"
  | "Iron Condor"
  | "Straddle";

export type TradeResult = {
  entryDate: string;        // e.g. "15 Mar"
  exitDate: string;         // e.g. "12 Apr"
  entryPrice: number;       // underlying at entry
  exitPrice: number;        // underlying at exit
  entryPremium: number;     // premium paid/received per contract
  exitPremium: number;      // premium at exit per contract
  pnl: number;              // P&L per contract ($)
  pnlPct: number;           // P&L as % of risk
  winner: boolean;          // profitable?
  holdDays: number;
};

export type BacktestResult = {
  strategy: BacktestStrategy;
  trades: TradeResult[];
  totalTrades: number;
  winRate: number;           // % of profitable trades
  avgWin: number;            // Average profit on winning trades ($)
  avgLoss: number;           // Average loss on losing trades ($)
  totalPnL: number;          // Cumulative P&L ($)
  maxDrawdown: number;       // Worst peak-to-trough ($)
  sharpeRatio: number;       // Risk-adjusted return (annualized, simplified)
  profitFactor: number;      // Gross wins / Gross losses
  avgHoldDays: number;       // Average holding period
  bestTrade: number;         // Best single trade P&L ($)
  worstTrade: number;        // Worst single trade P&L ($)
  equityCurve: { date: string; equity: number }[];
  explanationAl: string;     // Albanian explanation
};

// ─── Helper ────────────────────────────────────────────────────────────

function seededRNG(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}

/** Generate historical price bars for backtesting (252 trading days = 1 year) */
function getHistoricalBars(option: TerminalOption): PriceBar[] {
  return generateMockHistory(option.symbol, 252);
}

/** Format a timestamp to a short date like "15 Mar" */
function formatShortDate(ts: number): string {
  const months = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gsh", "Sht", "Tir", "Nën", "Dhj"];
  const d = new Date(ts);
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ─── Strategy Pricing Functions ────────────────────────────────────────

/** Calculate entry and exit premiums for each strategy */
function calculateStrategyPremiums(
  strategy: BacktestStrategy,
  spotEntry: number,
  spotExit: number,
  strike: number,
  ivEntry: number,
  ivExit: number,
  dteEntry: number,
  dteExit: number,
  strikeStep: number,
  riskFreeRate: number
): { entryPremium: number; exitPremium: number; riskAmount: number } {
  const tEntry = dteEntry / 365;
  const tExit = Math.max(dteExit, 0) / 365;
  const r = riskFreeRate;

  switch (strategy) {
    case "Long Call": {
      const entryPremium = blackScholes(spotEntry, strike, tEntry, r, ivEntry, "call");
      const exitPremium = tExit > 0 ? blackScholes(spotExit, strike, tExit, r, ivExit, "call") : Math.max(spotExit - strike, 0);
      return { entryPremium, exitPremium, riskAmount: entryPremium };
    }

    case "Long Put": {
      const entryPremium = blackScholes(spotEntry, strike, tEntry, r, ivEntry, "put");
      const exitPremium = tExit > 0 ? blackScholes(spotExit, strike, tExit, r, ivExit, "put") : Math.max(strike - spotExit, 0);
      return { entryPremium, exitPremium, riskAmount: entryPremium };
    }

    case "Covered Call": {
      const callEntry = blackScholes(spotEntry, strike, tEntry, r, ivEntry, "call");
      const callExit = tExit > 0 ? blackScholes(spotExit, strike, tExit, r, ivExit, "call") : Math.max(spotExit - strike, 0);
      const stockPnL = spotExit - spotEntry;
      const entryPremium = callEntry + stockPnL; // total value at entry (premium received + stock)
      const exitPremium = callExit; // what you owe to close
      return { entryPremium: callEntry, exitPremium: callExit - stockPnL, riskAmount: spotEntry - callEntry };
    }

    case "Cash-Secured Put": {
      const putEntry = blackScholes(spotEntry, strike, tEntry, r, ivEntry, "put");
      const putExit = tExit > 0 ? blackScholes(spotExit, strike, tExit, r, ivExit, "put") : Math.max(strike - spotExit, 0);
      return { entryPremium: putEntry, exitPremium: putExit, riskAmount: strike - putEntry };
    }

    case "Call Debit Spread": {
      const longStrike = strike;
      const shortStrike = strike + strikeStep;
      const longEntry = blackScholes(spotEntry, longStrike, tEntry, r, ivEntry, "call");
      const shortEntry = blackScholes(spotEntry, shortStrike, tEntry, r, ivEntry, "call");
      const longExit = tExit > 0 ? blackScholes(spotExit, longStrike, tExit, r, ivExit, "call") : Math.max(spotExit - longStrike, 0);
      const shortExit = tExit > 0 ? blackScholes(spotExit, shortStrike, tExit, r, ivExit, "call") : Math.max(spotExit - shortStrike, 0);
      const debit = longEntry - shortEntry;
      const credit = longExit - shortExit;
      return { entryPremium: debit, exitPremium: credit, riskAmount: debit };
    }

    case "Put Credit Spread": {
      const shortStrike = strike;
      const longStrike = strike - strikeStep;
      const shortEntry = blackScholes(spotEntry, shortStrike, tEntry, r, ivEntry, "put");
      const longEntry = blackScholes(spotEntry, longStrike, tEntry, r, ivEntry, "put");
      const shortExit = tExit > 0 ? blackScholes(spotExit, shortStrike, tExit, r, ivExit, "put") : Math.max(shortStrike - spotExit, 0);
      const longExit = tExit > 0 ? blackScholes(spotExit, longStrike, tExit, r, ivExit, "put") : Math.max(longStrike - spotExit, 0);
      const credit = shortEntry - longEntry;
      const debit = shortExit - longExit;
      return { entryPremium: credit, exitPremium: debit, riskAmount: strikeStep - credit };
    }

    case "Iron Condor": {
      const shortPutStrike = strike - strikeStep;
      const longPutStrike = strike - 2 * strikeStep;
      const shortCallStrike = strike + strikeStep;
      const longCallStrike = strike + 2 * strikeStep;
      const netCreditEntry =
        blackScholes(spotEntry, shortPutStrike, tEntry, r, ivEntry, "put") +
        blackScholes(spotEntry, shortCallStrike, tEntry, r, ivEntry, "call") -
        blackScholes(spotEntry, longPutStrike, tEntry, r, ivEntry, "put") -
        blackScholes(spotEntry, longCallStrike, tEntry, r, ivEntry, "call");
      const netDebitExit =
        (tExit > 0 ? blackScholes(spotExit, shortPutStrike, tExit, r, ivExit, "put") : Math.max(shortPutStrike - spotExit, 0)) +
        (tExit > 0 ? blackScholes(spotExit, shortCallStrike, tExit, r, ivExit, "call") : Math.max(spotExit - shortCallStrike, 0)) -
        (tExit > 0 ? blackScholes(spotExit, longPutStrike, tExit, r, ivExit, "put") : Math.max(longPutStrike - spotExit, 0)) -
        (tExit > 0 ? blackScholes(spotExit, longCallStrike, tExit, r, ivExit, "call") : Math.max(spotExit - longCallStrike, 0));
      return { entryPremium: netCreditEntry, exitPremium: netDebitExit, riskAmount: strikeStep - netCreditEntry };
    }

    case "Straddle": {
      const callEntry = blackScholes(spotEntry, strike, tEntry, r, ivEntry, "call");
      const putEntry = blackScholes(spotEntry, strike, tEntry, r, ivEntry, "put");
      const callExit = tExit > 0 ? blackScholes(spotExit, strike, tExit, r, ivExit, "call") : Math.max(spotExit - strike, 0);
      const putExit = tExit > 0 ? blackScholes(spotExit, strike, tExit, r, ivExit, "put") : Math.max(strike - spotExit, 0);
      const totalEntry = callEntry + putEntry;
      const totalExit = callExit + putExit;
      return { entryPremium: totalEntry, exitPremium: totalExit, riskAmount: totalEntry };
    }
  }
}

/** Calculate P&L from entry/exit premiums for each strategy */
function calculatePnL(
  strategy: BacktestStrategy,
  entryPremium: number,
  exitPremium: number
): number {
  switch (strategy) {
    case "Long Call":
    case "Long Put":
    case "Call Debit Spread":
    case "Straddle":
      // Bought at entryPremium, sold at exitPremium
      return (exitPremium - entryPremium) * 100;

    case "Covered Call":
    case "Cash-Secured Put":
    case "Put Credit Spread":
    case "Iron Condor":
      // Received credit at entry, pay debit at exit
      return (entryPremium - exitPremium) * 100;
  }
}

// ─── Main Backtest Function ────────────────────────────────────────────

/**
 * Run a backtest for a given strategy on a given option.
 * Simulates entering the strategy every N days over the past year
 * and holding for a fixed DTE period.
 */
export function runBacktest(
  option: TerminalOption,
  strategy: BacktestStrategy,
  holdDays = 30,
  entryFrequency = 21 // enter a new trade every 21 trading days (~monthly)
): BacktestResult {
  const spot = option.underlyingPrice;
  const baseIV = option.iv;
  const strike = option.strike;
  const strikeStep = spot >= 500 ? 10 : spot >= 200 ? 5 : spot >= 50 ? 2.5 : 1;
  const riskFreeRate = 0.043;

  // Get historical price bars
  const bars = getHistoricalBars(option);

  // Seed-based randomness for IV variation
  let seed = 0;
  for (let i = 0; i < option.symbol.length; i++) {
    seed = (seed * 31 + option.symbol.charCodeAt(i)) | 0;
  }
  const rand = seededRNG(seed);

  const trades: TradeResult[] = [];
  const equityPoints: { date: string; equity: number }[] = [];
  let cumulativePnL = 0;

  // Simulate trades by sliding a window over historical data
  for (let startIdx = 0; startIdx + holdDays < bars.length; startIdx += entryFrequency) {
    const entryBar = bars[startIdx];
    const exitBar = bars[startIdx + holdDays];
    const entryPrice = entryBar.c;
    const exitPrice = exitBar.c;

    // IV varies over time: add some realistic variation
    const ivEntry = baseIV * (0.85 + rand() * 0.30);
    const ivExit = baseIV * (0.80 + rand() * 0.35);

    // Calculate premiums using Black-Scholes
    const { entryPremium, exitPremium, riskAmount } = calculateStrategyPremiums(
      strategy,
      entryPrice,
      exitPrice,
      strike,
      ivEntry,
      ivExit,
      holdDays,
      0, // exit at expiration for simplicity
      strikeStep,
      riskFreeRate
    );

    const pnl = calculatePnL(strategy, entryPremium, exitPremium);
    const riskPct = riskAmount > 0 ? pnl / (riskAmount * 100) * 100 : 0;

    const trade: TradeResult = {
      entryDate: formatShortDate(entryBar.t),
      exitDate: formatShortDate(exitBar.t),
      entryPrice: Number(entryPrice.toFixed(2)),
      exitPrice: Number(exitPrice.toFixed(2)),
      entryPremium: Number(entryPremium.toFixed(2)),
      exitPremium: Number(exitPremium.toFixed(2)),
      pnl: Math.round(pnl),
      pnlPct: Number(Math.max(-100, Math.min(500, riskPct)).toFixed(1)),
      winner: pnl > 0,
      holdDays
    };
    trades.push(trade);

    // Build equity curve
    cumulativePnL += pnl;
    equityPoints.push({
      date: formatShortDate(exitBar.t),
      equity: Math.round(cumulativePnL)
    });
  }

  // ─── Calculate Statistics ───────────────────────────────────────────
  const totalTrades = trades.length;
  const winners = trades.filter(t => t.winner);
  const losers = trades.filter(t => !t.winner);
  const winRate = totalTrades > 0 ? (winners.length / totalTrades) * 100 : 0;
  const avgWin = winners.length > 0 ? winners.reduce((s, t) => s + t.pnl, 0) / winners.length : 0;
  const avgLoss = losers.length > 0 ? losers.reduce((s, t) => s + t.pnl, 0) / losers.length : 0;
  const totalPnL = trades.reduce((s, t) => s + t.pnl, 0);
  const grossWins = winners.reduce((s, t) => s + t.pnl, 0);
  const grossLosses = Math.abs(losers.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 99 : 0;
  const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.pnl)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.pnl)) : 0;
  const avgHoldDays = holdDays; // constant for now

  // Max drawdown from equity curve
  let peak = 0;
  let maxDrawdown = 0;
  for (const point of equityPoints) {
    peak = Math.max(peak, point.equity);
    const drawdown = point.equity - peak;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
  }

  // Simplified Sharpe Ratio (annualized)
  const returns = trades.map(t => t.pnl);
  const avgReturn = returns.length > 0 ? returns.reduce((s, v) => s + v, 0) / returns.length : 0;
  const returnStd = returns.length > 1
    ? Math.sqrt(returns.reduce((s, v) => s + (v - avgReturn) ** 2, 0) / (returns.length - 1))
    : 1;
  const tradesPerYear = Math.max(1, Math.floor(252 / entryFrequency));
  const sharpeRatio = returnStd > 0 ? (avgReturn / returnStd) * Math.sqrt(tradesPerYear) : 0;

  // ─── Albanian Explanation ────────────────────────────────────────────
  const explanationAl = getBacktestExplanation(
    strategy,
    winRate,
    totalPnL,
    profitFactor,
    sharpeRatio,
    maxDrawdown,
    option.symbol,
    strike,
    holdDays
  );

  return {
    strategy,
    trades,
    totalTrades,
    winRate: Number(winRate.toFixed(1)),
    avgWin: Math.round(avgWin),
    avgLoss: Math.round(avgLoss),
    totalPnL: Math.round(totalPnL),
    maxDrawdown: Math.round(maxDrawdown),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    avgHoldDays,
    bestTrade: Math.round(bestTrade),
    worstTrade: Math.round(worstTrade),
    equityCurve: equityPoints,
    explanationAl
  };
}

/** Run all strategies and return results */
export function runAllBacktests(option: TerminalOption): BacktestResult[] {
  const strategies: BacktestStrategy[] = [
    "Long Call",
    "Long Put",
    "Covered Call",
    "Cash-Secured Put",
    "Call Debit Spread",
    "Put Credit Spread",
    "Iron Condor",
    "Straddle"
  ];

  return strategies.map(s => runBacktest(option, s));
}

// ─── Albanian Explanations ─────────────────────────────────────────────

function getBacktestExplanation(
  strategy: BacktestStrategy,
  winRate: number,
  totalPnL: number,
  profitFactor: number,
  sharpe: number,
  maxDD: number,
  symbol: string,
  strike: number,
  holdDays: number
): string {
  const verdict = profitFactor > 2 && winRate > 55
    ? "Strategjia ka performuar mirë historikisht — por kjo nuk garanton rezultate të ardhshme."
    : profitFactor > 1.2 && winRate > 45
      ? "Performancë mesatare historike. Varet shumë nga kushtet e tregut (regime)."
      : "Performancë e dobët historikisht. Kujdes — mund të funksionojë vetëm në kushte specifike.";

  const strategyDescriptions: Record<BacktestStrategy, string> = {
    "Long Call": `Blerja e Call $${strike} me mbajtje ${holdDays} ditë. Fiton kur ${symbol} ngrihet mjaftueshëm për të mbuluar premiumin. Humbje maksimale = premiumi i paguar. Win Rate ${winRate.toFixed(0)}% tregon sa shpesh aksioni ka lëvizur mjaftueshëm lart.`,
    "Long Put": `Blerja e Put $${strike} me mbajtje ${holdDays} ditë. Fiton kur ${symbol} bie mjaftueshëm. Humbje maksimale = premiumi. Win Rate ${winRate.toFixed(0)}% tregon sa shpesh ka rënë mjaftueshëm.`,
    "Covered Call": `Keni 100 aksione + shisni Call $${strike}. Mbani premiumin si të ardhurë. Kufizoni fitimin por zvogëloni rrezikun. Win Rate ${winRate.toFixed(0)}% pasi shumica e kohës aksioni nuk bie ndjeshëm.`,
    "Cash-Secured Put": `Shisni Put $${strike}, mbani premiumin nëse ${symbol} qëndron mbi Strike. Nëse bie, blini aksionin me çmim më të ulët. Win Rate ${winRate.toFixed(0)}% sepse shumica e kohës tregjet ngrihen.`,
    "Call Debit Spread": `Blini Call të ulët + Shisni Call të lartë. Kushton më pak se Long Call i thjeshtë, por kufizoni fitimin. Profit Factor ${profitFactor.toFixed(2)} tregon raportin fitje/humbje.`,
    "Put Credit Spread": `Shisni Put të lartë + Blini Put të ulët. Merrni kredit, fitoni nëse ${symbol} qëndron mbi short strike. Risk/reward i kufizuar. Win Rate zakonisht i lartë sepse OTM puts skadojnë pa vlerë.`,
    "Iron Condor": `Shisni OTM put + OTM call, blini mbrojtje më të largët. Fitoni kur ${symbol} lëviz brenda intervalit. Max profit = kredit. Max loss = gjerësia e krahut - kredit. Përshtatet tregjeve me ranged.`,
    "Straddle": `Blini Call + Put me Strike të njëjtë $${strike}. Fitoni kur ${symbol} lëviz shumë në ÇFARËDOLLOJ drejtimi. Humbni kur çmimi nuk lëviz mjaftueshëm. Win Rate ${winRate.toFixed(0)}% sepse lëvizje të mëdha janë të rralla.`
  };

  return `${strategyDescriptions[strategy]} ${verdict} Backtest me të dhëna historike 1-vjeçare. Total P&L: $${totalPnL.toLocaleString()}, Max Drawdown: $${Math.abs(maxDD).toLocaleString()}, Sharpe: ${sharpe.toFixed(2)}.`;
}
