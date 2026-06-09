import { blackScholes, blackScholesGreeks, impliedVolatility } from "@/lib/blackscholes";
import type { HistoricalMetrics } from "@/lib/historicalAnalytics";
import { calculateHistoricalMetrics, generateMockHistory } from "@/lib/historicalAnalytics";
import { monteCarlo } from "@/lib/montecarlo";
import { signalEngine } from "@/lib/signalEngine";
import type { Stock } from "@/lib/sectors";

/**
 * Polygon option contract shape from the REST API.
 * Only the fields we actually read are declared.
 */
export interface PolygonOptionContract {
  details?: {
    contract_type?: string;
    strike_price?: number;
    expiration_date?: string;
  };
  implied_volatility?: number;
  last_quote?: {
    midpoint?: number;
  };
  last_trade?: {
    price?: number;
  };
  day?: {
    volume?: number;
  };
  open_interest?: number;
  underlying_asset?: {
    price?: number;
  };
  greeks?: {
    delta?: number;
    gamma?: number;
    theta?: number;
  };
}

export type TerminalOption = {
  symbol: string;
  name: string;
  sector: Stock["sector"];
  underlyingPrice: number;
  strike: number;
  dte: number;
  expirationDate: string;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  price: number;
  type: "call" | "put";
  volume: number;
  openInterest: number;
  fairValue: number;
  intrinsicValue: number;
  extrinsicValue: number;
  moneyness: "ITM" | "ATM" | "OTM";
  edge: number;
  opportunityScore: number;
  upsidePotential: number;
  profitProbability: number;
  mc: ReturnType<typeof monteCarlo>;
  signal: ReturnType<typeof signalEngine>;
  flow: "Sweep" | "Block" | "Split" | "Lit";
  premium: number;
  historical: HistoricalMetrics;
  historySource: string;
  dataSource: "real-options" | "synthetic-options";
  dataQuality: number;
  warnings: string[];
};

const sectorBias: Record<Stock["sector"], number> = {
  "AI Technology": 1.25,
  Semiconductors: 1.4,
  Tech: 1.1,
  Retail: 0.9,
  Consumer: 0.7,
  Industrials: 0.95,
  Energy: 1.05,
  Defense: 0.8,
  Auto: 1.35,
  Finance: 0.85,
  Healthcare: 0.75,
  "E-Commerce": 1.2
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

/** Intrinsic value: what the option is worth if exercised right now. */
function calcIntrinsicValue(spot: number, strike: number, type: "call" | "put"): number {
  if (type === "call") return Math.max(spot - strike, 0);
  return Math.max(strike - spot, 0);
}

/** Extrinsic (time) value: premium above intrinsic value. */
function calcExtrinsicValue(optionPrice: number, intrinsicValue: number): number {
  return Math.max(optionPrice - intrinsicValue, 0);
}

/** Moneyness classification: ITM = in-the-money, ATM = at-the-money, OTM = out-of-the-money */
function calcMoneyness(spot: number, strike: number, type: "call" | "put"): "ITM" | "ATM" | "OTM" {
  const ratio = spot / strike;
  if (type === "call") {
    if (ratio > 1.02) return "ITM";
    if (ratio < 0.98) return "OTM";
    return "ATM";
  }
  // put
  if (ratio < 0.98) return "ITM";
  if (ratio > 1.02) return "OTM";
  return "ATM";
}

function calculateOpportunityScore({
  edge,
  profitProbability,
  momentum30,
  macroRisk,
  signalScore,
  upsidePotential
}: {
  edge: number;
  profitProbability: number;
  momentum30: number;
  macroRisk: number;
  signalScore: number;
  upsidePotential: number;
}) {
  return Math.round(
    clamp(
      signalScore * 0.28 +
        profitProbability * 0.22 +
        clamp(edge + 50) * 0.16 +
        clamp(momentum30 * 500 + 50) * 0.14 +
        clamp(upsidePotential * 2 + 50) * 0.12 -
        macroRisk * 0.08
    )
  );
}

/** FNV-1a hash – much better distribution than a char-code sum. */
function hashSymbol(symbol: string) {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < symbol.length; i++) {
    hash ^= symbol.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return hash >>> 0; // ensure unsigned
}

function resolveSpot(historical: HistoricalMetrics, quotePrice?: number) {
  const historicalSpot = historical.spot || 100;

  if (!quotePrice || !Number.isFinite(quotePrice) || quotePrice <= 0) {
    return historicalSpot;
  }

  // Trust the real quote price — it comes from live market data (Yahoo/Polygon).
  // The historical.spot may be from mock data and wildly different.
  // Only discard the quote if it's clearly garbage (ratio > 20 or < 0.05).
  const ratio = quotePrice / Math.max(historicalSpot, 1);

  if (ratio > 20 || ratio < 0.05) {
    return historicalSpot;
  }

  return quotePrice;
}

function alignHistoricalSpot(historical: HistoricalMetrics, spot: number): HistoricalMetrics {
  return {
    ...historical,
    spot
  };
}

function chooseSyntheticType(historical: HistoricalMetrics): "call" | "put" {
  if (historical.trend === "Downtrend" || historical.momentum30 < -0.035) return "put";
  return "call";
}

function syntheticIv(stock: Stock, historical: HistoricalMetrics) {
  const sectorFloor = 0.16 * sectorBias[stock.sector];
  const realized = Math.max(historical.realizedVol30, historical.realizedVol90 * 0.9, 0);
  return Number(clamp(Math.max(sectorFloor, realized * 1.08, 0.16), 0.12, 0.95).toFixed(3));
}

function directionalPotential(type: "call" | "put", spot: number, mc: ReturnType<typeof monteCarlo>) {
  return type === "call"
    ? ((mc.p95 - spot) / Math.max(spot, 1)) * 100
    : ((spot - mc.var5) / Math.max(spot, 1)) * 100;
}

function directionalProbability(type: "call" | "put", mc: ReturnType<typeof monteCarlo>) {
  return type === "call" ? mc.bullish : mc.bearish;
}

function targetStrike(spot: number, type: "call" | "put", seed: number) {
  const strikeStep = spot >= 200 ? 5 : spot >= 50 ? 2.5 : 1;
  const targetMoneyness = type === "call" ? 1.02 + (seed % 3) * 0.01 : 0.98 - (seed % 3) * 0.01;
  return Math.round((spot * targetMoneyness) / strikeStep) * strikeStep;
}

function dataDiagnostics(historySource: string, dataSource: TerminalOption["dataSource"], optionsSource?: string) {
  const warnings: string[] = [];
  let dataQuality = 100;

  if (dataSource === "synthetic-options") {
    dataQuality -= 25;
    warnings.push("Options chain is synthetic because no live options feed is connected.");
  } else if (dataSource === "real-options") {
    // Real options data — all live sources are high quality, no penalty
  }

  if (historySource === "simulated") {
    dataQuality -= 40;
    warnings.push("Historical data is simulated because free sources returned no full history.");
  } else if (historySource.includes("partial")) {
    dataQuality -= 20;
    warnings.push("Historical data is partial, so volatility and momentum are less reliable.");
  } else if (historySource === "unknown") {
    dataQuality -= 15;
    warnings.push("Historical data source is unknown.");
  }

  return {
    dataQuality: Math.max(0, Math.min(100, dataQuality)),
    warnings
  };
}

function mockOption(
  stock: Stock,
  historicalOverride?: HistoricalMetrics,
  quotePrice?: number,
  historySource = "simulated"
): TerminalOption {
  const seed = hashSymbol(stock.symbol);
  const rawHistorical = historicalOverride || calculateHistoricalMetrics(generateMockHistory(stock.symbol));
  const spot = resolveSpot(rawHistorical, quotePrice);
  const historical = alignHistoricalSpot(rawHistorical, spot);
  const type = chooseSyntheticType(historical);
  const strike = targetStrike(spot, type, seed);
  const iv = syntheticIv(stock, historical);
  const volume = 500 + (seed % 9000);
  const openInterest = 700 + ((seed * 13) % 12000);
  const fairValue = blackScholes(spot, strike, 30 / 365, 0.05, iv, type);
  const pricingSkew = 0.94 + (seed % 13) / 100;
  const price = Number(Math.max(0.05, fairValue * pricingSkew).toFixed(2));
  const intrinsicValue = calcIntrinsicValue(spot, strike, type);
  const extrinsicValue = calcExtrinsicValue(fairValue, intrinsicValue);
  const moneyness = calcMoneyness(spot, strike, type);
  const greeks = blackScholesGreeks(spot, strike, 30 / 365, 0.05, iv, type);
  const delta = Number(greeks.delta.toFixed(2));
  const gamma = Number(greeks.gamma.toFixed(3));
  const theta = Number(greeks.theta.toFixed(3));
  const vega = Number(greeks.vega.toFixed(4));
  const rho = Number(greeks.rho.toFixed(4));
  const mc = monteCarlo(spot, Math.max(iv * 0.85, historical.realizedVol30, 0.12), 0.05, 30, 5000, seed);
  const signal = signalEngine({ delta, gamma, theta, iv, volume, openInterest, type });
  const edge = ((fairValue - price) / Math.max(price, 1)) * 100;
  const upsidePotential = directionalPotential(type, spot, mc);
  const profitProbability = directionalProbability(type, mc);
  const opportunityScore = calculateOpportunityScore({
    edge,
    profitProbability,
    momentum30: historical.momentum30,
    macroRisk: historical.maxDrawdown < -0.3 ? 80 : historical.maxDrawdown < -0.18 ? 65 : 40,
    signalScore: signal.score,
    upsidePotential
  });
  const flowTypes: TerminalOption["flow"][] = ["Sweep", "Block", "Split", "Lit"];
  const diagnostics = dataDiagnostics(historySource, "synthetic-options");

  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    underlyingPrice: spot,
    strike,
    dte: 30,
    expirationDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    iv,
    delta,
    gamma,
    theta,
    vega,
    rho,
    price,
    type,
    volume,
    openInterest,
    fairValue,
    intrinsicValue,
    extrinsicValue,
    moneyness,
    edge,
    opportunityScore: Math.max(0, Math.round(opportunityScore - (100 - diagnostics.dataQuality) * 0.2)),
    upsidePotential,
    profitProbability,
    mc,
    signal,
    flow: flowTypes[seed % flowTypes.length],
    premium: Math.round(price * volume * 100),
    historical,
    historySource,
    dataSource: "synthetic-options",
    dataQuality: diagnostics.dataQuality,
    warnings: diagnostics.warnings
  };
}

export function normalizePolygonOption(
  stock: Stock,
  first: PolygonOptionContract,
  historical = calculateHistoricalMetrics(generateMockHistory(stock.symbol)),
  quotePrice?: number,
  historySource = "unknown",
  optionsSource?: string
): TerminalOption {
  const fallback = mockOption(stock, historical, quotePrice, historySource);
  const optionType = first?.details?.contract_type === "put" ? "put" : "call";
  const strike = Number(first?.details?.strike_price || fallback.strike);
  const iv = Number(first?.implied_volatility || fallback.iv);
  const price = Number(first?.last_quote?.midpoint || first?.last_trade?.price || fallback.price);
  const volume = Number(first?.day?.volume || fallback.volume);
  const openInterest = Number(first?.open_interest || fallback.openInterest);
  const apiSpot = Number(first?.underlying_asset?.price || 0) || undefined;
  const spot = resolveSpot(historical, quotePrice || apiSpot);
  const alignedHistorical = alignHistoricalSpot(historical, spot);

  // Compute actual DTE from contract expiration date
  const expirationStr = first?.details?.expiration_date;
  const expirationMs = expirationStr
    ? new Date(`${expirationStr}T00:00:00Z`).getTime()
    : Date.now() + 30 * 86_400_000;
  const actualDTE = Math.max(1, Math.round((expirationMs - Date.now()) / 86_400_000));
  const dteFraction = actualDTE / 365;

  // Risk-free rate approximation (current ~4.3% as of 2026)
  const riskFreeRate = 0.043;

  // Step 1: Compute true implied volatility from market price.
  // Yahoo's reported IV can be stale/smoothed, so we solve for the exact IV
  // that makes Black-Scholes price = market price (Newton-Raphson).
  const yahooIV = iv > 0.01 ? iv : 0.3;
  const solvedIV = price > 0.05
    ? impliedVolatility(spot, strike, dteFraction, riskFreeRate, price, optionType, yahooIV)
    : yahooIV;

  // Use the solved IV (from market price) for all calculations
  // This ensures BS price ≈ market price and Greeks are accurate
  const ivForPricing = solvedIV;

  // Step 2: Fair Value = BS with the true market-implied IV
  // This should be very close to market price (within pennies)
  const fairValue = blackScholes(spot, strike, dteFraction, riskFreeRate, ivForPricing, optionType);
  const greeks = blackScholesGreeks(spot, strike, dteFraction, riskFreeRate, ivForPricing, optionType);
  const delta = Number(first?.greeks?.delta ?? greeks.delta);
  const gamma = Number(first?.greeks?.gamma ?? greeks.gamma);
  const theta = Number(first?.greeks?.theta ?? greeks.theta);
  const vega = Number(greeks.vega.toFixed(4));
  const rho = Number(greeks.rho.toFixed(4));
  const mc = monteCarlo(spot, Math.max((ivForPricing) * 0.85, alignedHistorical.realizedVol30, 0.12), riskFreeRate, actualDTE, 5000, hashSymbol(stock.symbol));
  const rawSignal = signalEngine({ delta, gamma, theta, iv: ivForPricing, volume, openInterest, type: optionType });
  const score = Math.max(0, Math.min(100, rawSignal.score + alignedHistorical.confidenceBoost));
  const signal = {
    ...rawSignal,
    score,
    confidence: score >= 82 ? "High" : score >= 68 ? "Medium" : score <= 35 ? "Defensive" : "Low"
  };
  // Edge = BS fair value vs market price. Should be near 0% now since we solved
  // IV from market price. Any residual edge is from Newton-Raphson precision.
  const edge = ((fairValue - price) / Math.max(price, 1)) * 100;
  const intrinsicValue = calcIntrinsicValue(spot, strike, optionType);
  const extrinsicValue = calcExtrinsicValue(fairValue, intrinsicValue);
  const moneyness = calcMoneyness(spot, strike, optionType);
  const upsidePotential = directionalPotential(optionType, spot, mc);
  const profitProbability = directionalProbability(optionType, mc);
  const opportunityScore = calculateOpportunityScore({
    edge,
    profitProbability,
    momentum30: alignedHistorical.momentum30,
    macroRisk: alignedHistorical.maxDrawdown < -0.3 ? 80 : alignedHistorical.maxDrawdown < -0.18 ? 65 : 40,
    signalScore: signal.score,
    upsidePotential
  });
  const dataSource: TerminalOption["dataSource"] = first ? "real-options" : "synthetic-options";
  const diagnostics = dataDiagnostics(historySource, dataSource, optionsSource);

  return {
    ...fallback,
    underlyingPrice: spot,
    strike,
    dte: actualDTE,
    expirationDate: expirationStr || fallback.expirationDate,
    iv: ivForPricing,
    delta,
    gamma,
    theta,
    vega,
    rho,
    price,
    type: optionType,
    volume,
    openInterest,
    fairValue,
    intrinsicValue,
    extrinsicValue,
    moneyness,
    edge,
    opportunityScore: Math.max(0, Math.round(opportunityScore - (100 - diagnostics.dataQuality) * 0.2)),
    upsidePotential,
    profitProbability,
    mc,
    signal,
    premium: Math.round(price * volume * 100),
    historical: alignedHistorical,
    historySource,
    dataSource,
    dataQuality: diagnostics.dataQuality,
    warnings: diagnostics.warnings
  };
}

export function buildMockTerminalData(stocks: Stock[]) {
  return stocks.map((stock) => mockOption(stock));
}

export function buildSyntheticOption(
  stock: Stock,
  historical = calculateHistoricalMetrics(generateMockHistory(stock.symbol)),
  quotePrice?: number,
  historySource = "simulated"
) {
  return mockOption(stock, historical, quotePrice, historySource);
}

export function pickOptionContract(
  contracts: PolygonOptionContract[] | undefined,
  historical: HistoricalMetrics,
  quotePrice?: number
) {
  if (!Array.isArray(contracts) || !contracts.length) return null;

  const spot = resolveSpot(historical, quotePrice);
  const preferredType = chooseSyntheticType(alignHistoricalSpot(historical, spot));
  const now = Date.now();

  return contracts
    .filter((contract) => {
      const strike = Number(contract?.details?.strike_price || 0);
      const type = contract?.details?.contract_type;
      const iv = Number(contract?.implied_volatility || 0);
      // Filter out contracts with extreme IV (150%+ means deep OTM and nearly worthless)
      const reasonableIV = iv < 1.5;
      return strike > 0 && reasonableIV && (type === "call" || type === "put") && strike / spot > 0.65 && strike / spot < 1.35;
    })
    .map((contract) => {
      const strike = Number(contract?.details?.strike_price || spot);
      const type = contract?.details?.contract_type === "put" ? "put" : "call";
      const expiration = contract?.details?.expiration_date
        ? new Date(`${contract.details.expiration_date}T00:00:00Z`).getTime()
        : now + 30 * 86_400_000;
      const dte = Math.max(1, Math.round((expiration - now) / 86_400_000));
      // Prefer ATM (moneyness ~1.0) — closest to the money has best liquidity & tightest spreads
      // OTM calls have cheap premium but low delta; ITM calls have intrinsic value but cost more
      // ATM is the sweet spot for signal analysis
      const moneyness = strike / spot;
      const moneynessPenalty = Math.abs(moneyness - 1.0) * 100;
      const dtePenalty = Math.abs(dte - 30) * 0.5;
      const typeBonus = type === preferredType ? 0 : 8;
      const score = moneynessPenalty + dtePenalty + typeBonus;

      return { contract, score };
    })
    .sort((a, b) => a.score - b.score)[0]?.contract || null;
}

export function buildVolSurface(symbol: string) {
  const seed = hashSymbol(symbol);
  return [7, 14, 30, 60, 90].flatMap((dte) =>
    [-15, -8, 0, 8, 15].map((moneyness) => ({
      name: `${dte}D ${moneyness > 0 ? "+" : ""}${moneyness}%`,
      dte,
      moneyness,
      iv: Number((22 + (seed % 17) + dte / 5 + Math.abs(moneyness) * 0.9).toFixed(1))
    }))
  );
}

export function buildRiskCurve(input: TerminalOption | string) {
  if (typeof input !== "string") {
    const isShort = input.signal.signal.startsWith("SELL");
    const dteFraction = (input.dte || 30) / 365;

    return Array.from({ length: 17 }, (_, index) => {
      const move = index - 8;
      const shiftedSpot = input.underlyingPrice * (1 + move / 100);
      const shiftedValue = blackScholes(
        shiftedSpot,
        input.strike,
        dteFraction,
        0.043,
        input.iv,
        input.type
      );
      const longPnl = (shiftedValue - input.price) * 100;

      return {
        move: `${move > 0 ? "+" : ""}${move}%`,
        pnl: Math.round((isShort ? -longPnl : longPnl) * 10) / 10
      };
    });
  }

  const seed = hashSymbol(input);
  return Array.from({ length: 17 }, (_, index) => {
    const move = index - 8;
    const convexity = 0.8 + (seed % 5) / 10;
    return {
      move: `${move > 0 ? "+" : ""}${move}%`,
      pnl: Math.round((move * 420 + move * move * convexity * 28 - 740) * 10) / 10
    };
  });
}
