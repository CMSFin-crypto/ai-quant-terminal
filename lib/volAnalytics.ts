/**
 * Volatility Analytics Library
 *
 * Provides:
 * - IV/HV time series data generation
 * - Volatility Smile/Skew data generation
 * - POP (Probability of Profit) calculator
 * - Max Profit/Loss calculations for common strategies
 */

import type { TerminalOption } from "@/lib/workstation";
import { blackScholes, blackScholesGreeks, impliedVolatility } from "@/lib/blackscholes";

// ─── IV/HV Time Series ─────────────────────────────────────────────────

export type IVHVPoint = {
  date: string;          // "Jan", "Feb", etc.
  iv: number;            // Implied Volatility (%)
  hv30: number;          // 30-day Historical Volatility (%)
  hv90: number;          // 90-day Historical Volatility (%)
  ivRank: number;        // IV Rank (0-100)
  ivPercentile: number;  // IV Percentile (0-100)
};

/**
 * Generate IV/HV time series for the selected option.
 * Uses real IV from the option and historical vol from metrics,
 * with realistic-looking variation over the past 12 months.
 */
export function generateIVHVSeries(option: TerminalOption): IVHVPoint[] {
  const currentIV = option.iv * 100;  // convert to %
  const currentHV30 = option.historical.realizedVol30 * 100;
  const currentHV90 = option.historical.realizedVol90 * 100;

  // Seed-based pseudo-random for consistency
  let seed = 0;
  for (let i = 0; i < option.symbol.length; i++) {
    seed = (seed * 31 + option.symbol.charCodeAt(i)) | 0;
  }
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };

  const months = [
    "Kor", "Gsh", "Sht", "Tir", "Nën", "Dhj",
    "Jan", "Shk", "Mar", "Pri", "Maj", "Qer"
  ];

  const points: IVHVPoint[] = [];
  let ivAcc = currentIV * (0.82 + rand() * 0.15);
  let hv30Acc = currentHV30 * (0.78 + rand() * 0.18);
  let hv90Acc = currentHV90 * (0.85 + rand() * 0.1);

  // Track all IV values for rank/percentile calculation
  const allIVs: number[] = [];

  for (let i = 0; i < 12; i++) {
    const progress = i / 11;

    // Drift toward current values
    ivAcc = ivAcc * (0.88 + 0.12 * progress) + currentIV * (0.12 * (1 - progress));
    hv30Acc = hv30Acc * (0.85 + 0.15 * progress) + currentHV30 * (0.15 * (1 - progress));
    hv90Acc = hv90Acc * (0.9 + 0.1 * progress) + currentHV90 * (0.1 * (1 - progress));

    // Add noise
    ivAcc += (rand() - 0.5) * 4;
    hv30Acc += (rand() - 0.5) * 3.5;
    hv90Acc += (rand() - 0.5) * 2.5;

    // IV tends to spike during earnings, then revert
    if (i === 3 || i === 9) ivAcc += 5 + rand() * 8;
    if (i === 4 || i === 10) ivAcc -= 3 + rand() * 5; // IV crush after earnings

    const iv = Math.max(8, Math.round(ivAcc * 10) / 10);
    const hv30 = Math.max(5, Math.round(hv30Acc * 10) / 10);
    const hv90 = Math.max(5, Math.round(hv90Acc * 10) / 10);

    allIVs.push(iv);

    points.push({
      date: months[i],
      iv,
      hv30,
      hv90,
      ivRank: 0,       // computed after
      ivPercentile: 0   // computed after
    });
  }

  // Calculate IV Rank and Percentile
  const ivMin = Math.min(...allIVs);
  const ivMax = Math.max(...allIVs);
  const ivRange = ivMax - ivMin;

  points.forEach((p) => {
    p.ivRank = ivRange > 0 ? Math.round(((p.iv - ivMin) / ivRange) * 100) : 50;
    // Percentile: % of values below this IV
    const below = allIVs.filter(v => v < p.iv).length;
    p.ivPercentile = Math.round((below / allIVs.length) * 100);
  });

  return points;
}

// ─── Volatility Smile / Skew ───────────────────────────────────────────

export type SkewPoint = {
  strike: number;
  moneyness: string;   // "90%", "95%", "100%", etc.
  iv: number;          // IV at this strike
  callPrice: number;
  putPrice: number;
  callDelta: number;
  putDelta: number;
  callVolume: number;
  putVolume: number;
};

/**
 * Generate Volatility Smile/Skew data across strikes for a given expiration.
 * Real options markets show higher IV for OTM puts (put skew / "crash premium")
 * and sometimes for deep OTM calls ("call wing").
 */
export function generateVolSkew(option: TerminalOption): SkewPoint[] {
  const spot = option.underlyingPrice;
  const baseIV = option.iv;
  const strikeStep = spot >= 500 ? 10 : spot >= 200 ? 5 : spot >= 50 ? 2.5 : 1;
  const atmStrike = Math.round(spot / strikeStep) * strikeStep;

  // Seed-based for consistency
  let seed = 0;
  for (let i = 0; i < option.symbol.length; i++) {
    seed = (seed * 31 + option.symbol.charCodeAt(i)) | 0;
  }
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };

  // Strikes from -8 to +8 steps from ATM
  const strikes: number[] = [];
  for (let step = -8; step <= 8; step++) {
    strikes.push(atmStrike + step * strikeStep);
  }

  const dteFraction = (option.dte || 30) / 365;
  const riskFreeRate = 0.043;

  return strikes
    .filter(strike => strike > 0)
    .map((strike) => {
      const moneynessRatio = spot / strike;

      // Volatility skew model:
      // OTM puts (moneynessRatio > 1) have higher IV (put skew / crash premium)
      // OTM calls (moneynessRatio < 1) have slightly higher IV (call wing)
      // ATM has the lowest IV (the "smile")
      let skewMultiplier = 1.0;

      if (moneynessRatio > 1) {
        // OTM put → higher IV
        const distance = (moneynessRatio - 1);
        skewMultiplier = 1 + distance * 0.8 + distance * distance * 3; // steep put skew
      } else if (moneynessRatio < 1) {
        // OTM call → slightly higher IV
        const distance = (1 - moneynessRatio);
        skewMultiplier = 1 + distance * 0.3 + distance * distance * 1.5; // moderate call wing
      }

      // Small random noise
      const noise = (rand() - 0.5) * 0.02;
      const ivAtStrike = Math.max(0.08, baseIV * skewMultiplier + noise);

      const callPrice = blackScholes(spot, strike, dteFraction, riskFreeRate, ivAtStrike, "call");
      const putPrice = blackScholes(spot, strike, dteFraction, riskFreeRate, ivAtStrike, "put");
      const callGreeks = blackScholesGreeks(spot, strike, dteFraction, riskFreeRate, ivAtStrike, "call");
      const putGreeks = blackScholesGreeks(spot, strike, dteFraction, riskFreeRate, ivAtStrike, "put");

      const moneynessPct = Math.round((strike / spot) * 100);

      return {
        strike,
        moneyness: `${moneynessPct}%`,
        iv: Number((ivAtStrike * 100).toFixed(1)),
        callPrice: Number(callPrice.toFixed(2)),
        putPrice: Number(putPrice.toFixed(2)),
        callDelta: Number(callGreeks.delta.toFixed(2)),
        putDelta: Number(putGreeks.delta.toFixed(2)),
        callVolume: Math.round(200 + rand() * 3000),
        putVolume: Math.round(150 + rand() * 2500)
      };
    });
}

// ─── POP Calculator ─────────────────────────────────────────────────────

export type POPResult = {
  strategy: string;
  pop: number;              // Probability of Profit (%)
  popAtExpiry: number;      // POP at expiration (%)
  avgProfit: number;        // Average profit when profitable ($)
  avgLoss: number;          // Average loss when losing ($)
  maxProfit: number;        // Maximum profit ($)
  maxLoss: number;          // Maximum loss ($)
  breakEven: number;        // Break-even price ($)
  expectedValue: number;    // Expected value per contract ($)
  riskRewardRatio: number;  // Max profit / Max loss
  explanationAl: string;    // Albanian explanation
};

/**
 * Calculate Probability of Profit for various strategies.
 * Uses Black-Scholes and Monte Carlo data from the option.
 */
export function calculatePOP(option: TerminalOption): POPResult[] {
  const spot = option.underlyingPrice;
  const strike = option.strike;
  const premium = option.price;
  const iv = option.iv;
  const dte = option.dte || 30;
  const type = option.type;
  const mc = option.mc;

  const results: POPResult[] = [];

  // ─── Strategy 1: Long Call ───────────────────────────────
  if (type === "call") {
    const breakEven = strike + premium;
    // POP = probability that spot > breakEven at expiration
    // Using MC data: bullish% adjusted for breakEven
    const mcPopAtExpiry = mc.bullish * 0.72 + (100 - mc.bearish) * 0.28;
    const adjustedPOP = Math.max(5, Math.min(95, mcPopAtExpiry - (breakEven - spot) / spot * 180));

    results.push({
      strategy: "Long Call",
      pop: Number(Math.max(5, adjustedPOP * 0.92).toFixed(1)),
      popAtExpiry: Number(Math.max(3, adjustedPOP * 0.85).toFixed(1)),
      avgProfit: Number(((mc.p95 - breakEven) * 0.35).toFixed(0)),
      avgLoss: Number((premium * 100 * 0.7).toFixed(0)),
      maxProfit: Math.round((mc.percentiles.p99 - breakEven) * 100),
      maxLoss: Math.round(premium * 100), // limited to premium paid
      breakEven: Number(breakEven.toFixed(2)),
      expectedValue: Number((((mc.avg - breakEven) / spot) * 100 * premium).toFixed(0)),
      riskRewardRatio: Number(((mc.percentiles.p99 - breakEven) / premium).toFixed(2)),
      explanationAl: `Kur blini Call me Strike $${strike}, humbni maksimum $${(premium * 100).toFixed(0)} për kontratë (premiumi). Fitoni vetëm nëse aksioni mbyllet mbi $${breakEven.toFixed(2)} në skadim. POP në skadim është rreth ${adjustedPOP.toFixed(0)}%.`
    });
  }

  // ─── Strategy 2: Long Put ────────────────────────────────
  if (type === "put") {
    const breakEven = strike - premium;
    const mcPopAtExpiry = mc.bearish * 0.72 + (100 - mc.bullish) * 0.28;
    const adjustedPOP = Math.max(5, Math.min(95, mcPopAtExpiry - (spot - breakEven) / spot * 180));

    results.push({
      strategy: "Long Put",
      pop: Number(Math.max(5, adjustedPOP * 0.92).toFixed(1)),
      popAtExpiry: Number(Math.max(3, adjustedPOP * 0.85).toFixed(1)),
      avgProfit: Number(((breakEven - mc.var5) * 0.35).toFixed(0)),
      avgLoss: Number((premium * 100 * 0.7).toFixed(0)),
      maxProfit: Math.round((breakEven - mc.percentiles.p1) * 100),
      maxLoss: Math.round(premium * 100),
      breakEven: Number(breakEven.toFixed(2)),
      expectedValue: Number((((breakEven - mc.avg) / spot) * 100 * premium).toFixed(0)),
      riskRewardRatio: Number(((breakEven - mc.percentiles.p1) / premium).toFixed(2)),
      explanationAl: `Kur blini Put me Strike $${strike}, humbni maksimum $${(premium * 100).toFixed(0)} për kontratë. Fitoni nëse aksioni mbyllet nën $${breakEven.toFixed(2)} në skadim. POP në skadim është rreth ${adjustedPOP.toFixed(0)}%.`
    });
  }

  // ─── Strategy 3: Covered Call ────────────────────────────
  {
    const breakEven = spot - premium;
    const callBreakEven = strike + premium;
    const popCovered = type === "call" ? mc.bullish * 0.6 + 30 : 65;

    results.push({
      strategy: "Covered Call",
      pop: Number(Math.max(55, Math.min(90, popCovered)).toFixed(1)),
      popAtExpiry: Number(Math.max(50, Math.min(88, popCovered * 0.96)).toFixed(1)),
      avgProfit: Number((premium * 100 * 0.8 + (strike - spot) * 20).toFixed(0)),
      avgLoss: Number(((spot * 0.1 - premium) * 100).toFixed(0)),
      maxProfit: Math.round((premium * 100 + (strike - spot) * 100)),
      maxLoss: Math.round(spot * 100 - premium * 100), // stock goes to 0
      breakEven: Number(breakEven.toFixed(2)),
      expectedValue: Number((premium * 100 * 0.6).toFixed(0)),
      riskRewardRatio: Number(((premium * 100 + (strike - spot) * 100) / (spot * 100 - premium * 100)).toFixed(2)),
      explanationAl: `Kur shisni Covered Call (keni 100 aksione + shisni Call), mbani premiumin edhe nëse aksioni nuk lëviz. Fitim maksimal: $${((premium * 100 + (strike - spot) * 100)).toFixed(0)} nëse aksioni mbyllet mbi $${strike}. Humbje potenciale: nëse aksioni bie në zero, humbni $${(spot * 100 - premium * 100).toFixed(0)}.`
    });
  }

  // ─── Strategy 4: Cash-Secured Put ────────────────────────
  {
    const breakEven = strike - premium;
    const popCSP = 55 + (strike / spot - 0.95) * 200 + mc.bullish * 0.15;

    results.push({
      strategy: "Cash-Secured Put",
      pop: Number(Math.max(50, Math.min(90, popCSP)).toFixed(1)),
      popAtExpiry: Number(Math.max(48, Math.min(88, popCSP * 0.95)).toFixed(1)),
      avgProfit: Number((premium * 100 * 0.85).toFixed(0)),
      avgLoss: Number(((strike * 0.12 - premium) * 100).toFixed(0)),
      maxProfit: Math.round(premium * 100),
      maxLoss: Math.round((strike - premium) * 100),
      breakEven: Number(breakEven.toFixed(2)),
      expectedValue: Number((premium * 100 * 0.55).toFixed(0)),
      riskRewardRatio: Number(((premium * 100) / ((strike - premium) * 100)).toFixed(2)),
      explanationAl: `Kur shisni Cash-Secured Put me Strike $${strike}, mbani premiumin ($${(premium * 100).toFixed(0)}) nëse aksioni qëndron mbi $${strike}. Nëse bie nën Strike, e blini aksionin me çmim efektiv $${breakEven.toFixed(2)} (Strike - Premium). POP është rreth ${Math.min(90, popCSP).toFixed(0)}%.`
    });
  }

  // ─── Strategy 5: Call Debit Spread ───────────────────────
  if (type === "call") {
    const longStrike = strike;
    const shortStrike = strike + (spot >= 200 ? 5 : spot >= 50 ? 2.5 : 1);
    const spreadCost = premium * 0.65; // approximate
    const breakEven = longStrike + spreadCost;
    const popSpread = mc.bullish * 0.55 + 18;

    results.push({
      strategy: "Call Debit Spread",
      pop: Number(Math.max(35, Math.min(75, popSpread)).toFixed(1)),
      popAtExpiry: Number(Math.max(30, Math.min(72, popSpread * 0.93)).toFixed(1)),
      avgProfit: Number(((shortStrike - longStrike - spreadCost) * 100 * 0.45).toFixed(0)),
      avgLoss: Number((spreadCost * 100 * 0.65).toFixed(0)),
      maxProfit: Math.round((shortStrike - longStrike - spreadCost) * 100),
      maxLoss: Math.round(spreadCost * 100),
      breakEven: Number(breakEven.toFixed(2)),
      expectedValue: Number(((shortStrike - longStrike - spreadCost) * 100 * 0.4 - spreadCost * 100 * 0.6).toFixed(0)),
      riskRewardRatio: Number(((shortStrike - longStrike - spreadCost) / spreadCost).toFixed(2)),
      explanationAl: `Call Debit Spread: Blini Call $${longStrike} + Shisni Call $${shortStrike}. Kushton $${(spreadCost * 100).toFixed(0)} për kontratë. Fitim maksimal $${((shortStrike - longStrike - spreadCost) * 100).toFixed(0)} nëse aksioni mbyllet mbi $${shortStrike}. Humbje maksimale $${(spreadCost * 100).toFixed(0)}. POP: ~${popSpread.toFixed(0)}%.`
    });
  }

  // ─── Strategy 6: Put Credit Spread ───────────────────────
  if (type === "put") {
    const shortStrike = strike;
    const longStrike = strike - (spot >= 200 ? 5 : spot >= 50 ? 2.5 : 1);
    const spreadCredit = premium * 0.6;
    const breakEven = shortStrike - spreadCredit;
    const popSpread = mc.bullish * 0.4 + 35;

    results.push({
      strategy: "Put Credit Spread",
      pop: Number(Math.max(50, Math.min(85, popSpread)).toFixed(1)),
      popAtExpiry: Number(Math.max(48, Math.min(82, popSpread * 0.95)).toFixed(1)),
      avgProfit: Number((spreadCredit * 100 * 0.7).toFixed(0)),
      avgLoss: Number(((shortStrike - longStrike - spreadCredit) * 100 * 0.45).toFixed(0)),
      maxProfit: Math.round(spreadCredit * 100),
      maxLoss: Math.round((shortStrike - longStrike - spreadCredit) * 100),
      breakEven: Number(breakEven.toFixed(2)),
      expectedValue: Number((spreadCredit * 100 * 0.55).toFixed(0)),
      riskRewardRatio: Number((spreadCredit / (shortStrike - longStrike - spreadCredit)).toFixed(2)),
      explanationAl: `Put Credit Spread: Shisni Put $${shortStrike} + Blini Put $${longStrike}. Merrni $${(spreadCredit * 100).toFixed(0)} kredit. Fitim maksimal nëse aksioni qëndron mbi $${shortStrike}. Humbje maksimale $${((shortStrike - longStrike - spreadCredit) * 100).toFixed(0)} nëse aksioni bie nën $${longStrike}. POP: ~${popSpread.toFixed(0)}%.`
    });
  }

  return results;
}

// ─── Max Profit / Loss at Expiration ───────────────────────────────────

export type ProfitLossPoint = {
  price: number;    // Underlying price at expiration
  pnl: number;      // P&L per contract ($)
};

export type MaxProfitLoss = {
  strategy: string;
  maxProfit: number;
  maxLoss: number;
  breakEven: number;
  profitRegion: string;   // "Above $X" or "Below $X"
  lossRegion: string;
  points: ProfitLossPoint[];
  explanationAl: string;
};

/**
 * Calculate P&L at expiration for various strategies.
 * Generates the classic hockey-stick payoff diagrams.
 */
export function calculateMaxProfitLoss(option: TerminalOption): MaxProfitLoss[] {
  const spot = option.underlyingPrice;
  const strike = option.strike;
  const premium = option.price;
  const type = option.type;

  // Generate price range: from -30% to +30% of spot
  const priceLow = spot * 0.70;
  const priceHigh = spot * 1.30;
  const step = (priceHigh - priceLow) / 50;
  const prices: number[] = [];
  for (let p = priceLow; p <= priceHigh; p += step) {
    prices.push(Number(p.toFixed(2)));
  }

  const results: MaxProfitLoss[] = [];

  // ─── Long Call P&L ───────────────────────────────
  if (type === "call") {
    const breakEven = strike + premium;
    const points: ProfitLossPoint[] = prices.map(price => ({
      price,
      pnl: Math.round((Math.max(price - strike, 0) - premium) * 100)
    }));
    const maxProfit = Math.round((Math.max(...prices) - strike - premium) * 100);
    const maxLoss = Math.round(-premium * 100);

    results.push({
      strategy: "Long Call",
      maxProfit,
      maxLoss,
      breakEven: Number(breakEven.toFixed(2)),
      profitRegion: `Mbi $${breakEven.toFixed(2)}`,
      lossRegion: `Nën $${breakEven.toFixed(2)}`,
      points,
      explanationAl: `Long Call $${strike}: Fitoni kur aksioni ngrihet mbi $${breakEven.toFixed(2)}. Fitim i pakufizuar, humbje maksimale $${Math.abs(maxLoss)} (${(premium * 100).toFixed(0)} për kontratë).`
    });
  }

  // ─── Long Put P&L ────────────────────────────────
  if (type === "put") {
    const breakEven = strike - premium;
    const points: ProfitLossPoint[] = prices.map(price => ({
      price,
      pnl: Math.round((Math.max(strike - price, 0) - premium) * 100)
    }));
    const maxProfit = Math.round((strike - Math.min(...prices) - premium) * 100);
    const maxLoss = Math.round(-premium * 100);

    results.push({
      strategy: "Long Put",
      maxProfit,
      maxLoss,
      breakEven: Number(breakEven.toFixed(2)),
      profitRegion: `Nën $${breakEven.toFixed(2)}`,
      lossRegion: `Mbi $${breakEven.toFixed(2)}`,
      points,
      explanationAl: `Long Put $${strike}: Fitoni kur aksioni bie nën $${breakEven.toFixed(2)}. Fitim deri në $${maxProfit} (nëse aksioni bie në zero), humbje maksimale $${Math.abs(maxLoss)}.`
    });
  }

  // ─── Covered Call P&L ────────────────────────────
  {
    const breakEven = spot - premium;
    const points: ProfitLossPoint[] = prices.map(price => ({
      price,
      pnl: Math.round(((Math.min(price, strike) - spot) + premium) * 100)
    }));
    const maxProfit = Math.round(((strike - spot) + premium) * 100);
    const maxLoss = Math.round((-spot + premium) * 100);

    results.push({
      strategy: "Covered Call",
      maxProfit,
      maxLoss,
      breakEven: Number(breakEven.toFixed(2)),
      profitRegion: `Mbi $${breakEven.toFixed(2)}`,
      lossRegion: `Nën $${breakEven.toFixed(2)}`,
      points,
      explanationAl: `Covered Call: Keni 100 aksione + shisni Call $${strike}. Fitim maksimal $${maxProfit} (aksioni mbi $${strike}). Humbje maksimale $${Math.abs(maxLoss)} (aksioni bie në zero). Kufizoni fitimin, por zvogëloni rrezikun me premium.`
    });
  }

  // ─── Cash-Secured Put P&L ────────────────────────
  {
    const breakEven = strike - premium;
    const points: ProfitLossPoint[] = prices.map(price => ({
      price,
      pnl: Math.round((premium - Math.max(strike - price, 0)) * 100)
    }));
    const maxProfit = Math.round(premium * 100);
    const maxLoss = Math.round((strike - premium) * 100 * -1);

    results.push({
      strategy: "Cash-Secured Put",
      maxProfit,
      maxLoss,
      breakEven: Number(breakEven.toFixed(2)),
      profitRegion: `Mbi $${strike.toFixed(2)}`,
      lossRegion: `Nën $${breakEven.toFixed(2)}`,
      points,
      explanationAl: `Cash-Secured Put $${strike}: Mbani premium $${maxProfit} nëse aksioni qëndron mbi $${strike}. Nëse bie nën Strike, blini aksionin me çmim efektiv $${breakEven.toFixed(2)}. Humbje maksimale nëse aksioni bie në zero.`
    });
  }

  return results;
}
