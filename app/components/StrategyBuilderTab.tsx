"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend
} from "recharts";
import { Layers } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import { Panel } from "./Panel";

/**
 * Multi-Leg Strategy Builder
 *
 * Strategies implemented:
 *   1. Long Call         — bullish, defined risk
 *   2. Long Put          — bearish, defined risk
 *   3. Bull Call Spread  — bullish, defined risk, capped profit
 *   4. Bear Put Spread   — bearish, defined risk, capped profit
 *   5. Iron Condor       — neutral, defined risk, profit in range
 *   6. Butterfly         — pin-risk, defined risk, max profit at strike
 *   7. Straddle (Long)   — vol breakout, undefined risk on time
 *   8. Strangle (Long)   — vol breakout, cheaper than straddle
 *
 * For each, we plot P&L at expiration across a range of underlying prices.
 */

type StrategyKey =
  | "long_call" | "long_put"
  | "bull_call_spread" | "bear_put_spread"
  | "iron_condor" | "butterfly"
  | "long_straddle" | "long_strangle";

const STRATEGIES: { key: StrategyKey; name: string; bias: string; legs: number }[] = [
  { key: "long_call", name: "Long Call", bias: "Bullish", legs: 1 },
  { key: "long_put", name: "Long Put", bias: "Bearish", legs: 1 },
  { key: "bull_call_spread", name: "Bull Call Spread", bias: "Bullish", legs: 2 },
  { key: "bear_put_spread", name: "Bear Put Spread", bias: "Bearish", legs: 2 },
  { key: "iron_condor", name: "Iron Condor", bias: "Neutral", legs: 4 },
  { key: "butterfly", name: "Butterfly Spread", bias: "Pin Risk", legs: 3 },
  { key: "long_straddle", name: "Long Straddle", bias: "Volatility", legs: 2 },
  { key: "long_strangle", name: "Long Strangle", bias: "Volatility", legs: 2 },
];

interface Leg {
  type: "call" | "put";
  strike: number;
  premium: number;
  action: "buy" | "sell";
  qty: number;
}

function buildStrategy(strategy: StrategyKey, spot: number, iv: number, dte: number): Leg[] {
  const strikeStep = spot >= 500 ? 10 : spot >= 200 ? 5 : spot >= 50 ? 2.5 : 1;
  const atm = Math.round(spot / strikeStep) * strikeStep;
  const otmCall = atm + strikeStep;
  const otmPut = atm - strikeStep;
  const farCall = atm + 2 * strikeStep;
  const farPut = atm - 2 * strikeStep;

  // Premium approximation: 2% of spot for ATM, scaling by moneyness
  const premiumAt = (strike: number, type: "call" | "put") => {
    const intrinsic = type === "call" ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0);
    const extrinsic = spot * 0.02 * (iv / 0.3) * Math.sqrt(dte / 30);
    return Number((intrinsic + extrinsic).toFixed(2));
  };

  switch (strategy) {
    case "long_call":
      return [{ type: "call", strike: atm, premium: premiumAt(atm, "call"), action: "buy", qty: 1 }];
    case "long_put":
      return [{ type: "put", strike: atm, premium: premiumAt(atm, "put"), action: "buy", qty: 1 }];
    case "bull_call_spread":
      return [
        { type: "call", strike: atm, premium: premiumAt(atm, "call"), action: "buy", qty: 1 },
        { type: "call", strike: otmCall, premium: premiumAt(otmCall, "call"), action: "sell", qty: 1 },
      ];
    case "bear_put_spread":
      return [
        { type: "put", strike: atm, premium: premiumAt(atm, "put"), action: "buy", qty: 1 },
        { type: "put", strike: otmPut, premium: premiumAt(otmPut, "put"), action: "sell", qty: 1 },
      ];
    case "iron_condor":
      return [
        { type: "put", strike: farPut, premium: premiumAt(farPut, "put"), action: "buy", qty: 1 },
        { type: "put", strike: otmPut, premium: premiumAt(otmPut, "put"), action: "sell", qty: 1 },
        { type: "call", strike: otmCall, premium: premiumAt(otmCall, "call"), action: "sell", qty: 1 },
        { type: "call", strike: farCall, premium: premiumAt(farCall, "call"), action: "buy", qty: 1 },
      ];
    case "butterfly":
      return [
        { type: "call", strike: otmPut, premium: premiumAt(otmPut, "call"), action: "buy", qty: 1 },
        { type: "call", strike: atm, premium: premiumAt(atm, "call"), action: "sell", qty: 2 },
        { type: "call", strike: otmCall, premium: premiumAt(otmCall, "call"), action: "buy", qty: 1 },
      ];
    case "long_straddle":
      return [
        { type: "call", strike: atm, premium: premiumAt(atm, "call"), action: "buy", qty: 1 },
        { type: "put", strike: atm, premium: premiumAt(atm, "put"), action: "buy", qty: 1 },
      ];
    case "long_strangle":
      return [
        { type: "call", strike: otmCall, premium: premiumAt(otmCall, "call"), action: "buy", qty: 1 },
        { type: "put", strike: otmPut, premium: premiumAt(otmPut, "put"), action: "buy", qty: 1 },
      ];
    default:
      return [];
  }
}

/** P&L at expiration for a single leg */
function legPnlAtExpiration(leg: Leg, spot: number): number {
  const intrinsic = leg.type === "call"
    ? Math.max(spot - leg.strike, 0)
    : Math.max(leg.strike - spot, 0);
  const cost = leg.premium * leg.qty;
  return leg.action === "buy" ? (intrinsic - cost) * leg.qty : (cost - intrinsic) * leg.qty;
}

/** Total P&L at expiration for combined position */
function totalPnlAtExpiration(legs: Leg[], spot: number): number {
  return legs.reduce((sum, leg) => sum + legPnlAtExpiration(leg, spot), 0);
}

export function StrategyBuilderTab({ selectedOption }: { selectedOption: TerminalOption }) {
  const [strategy, setStrategy] = useState<StrategyKey>("iron_condor");

  const spot = selectedOption.underlyingPrice;
  const iv = selectedOption.iv;
  const dte = selectedOption.dte || 30;

  const legs = useMemo(
    () => buildStrategy(strategy, spot, iv, dte),
    [strategy, spot, iv, dte]
  );

  // P&L curve: ±20% around spot, 41 data points
  const pnlData = useMemo(() => {
    const points = 41;
    const range = 0.20; // ±20%
    const step = (spot * 2 * range) / (points - 1);
    const data = [];
    for (let i = 0; i < points; i++) {
      const priceSpot = spot * (1 - range) + i * step;
      const pnl = totalPnlAtExpiration(legs, priceSpot) * 100; // ×100 for 1 contract
      data.push({
        price: Number(priceSpot.toFixed(2)),
        pnl: Number(pnl.toFixed(0)),
      });
    }
    return data;
  }, [legs, spot]);

  // Strategy metrics
  const metrics = useMemo(() => {
    const netPremium = legs.reduce((sum, leg) =>
      sum + (leg.action === "buy" ? 1 : -1) * leg.premium * leg.qty, 0
    );
    const maxLoss = Math.min(...pnlData.map(p => p.pnl));
    const maxProfit = Math.max(...pnlData.map(p => p.pnl));

    // Find breakevens (where P&L crosses zero)
    const breakevens: number[] = [];
    for (let i = 1; i < pnlData.length; i++) {
      const prev = pnlData[i - 1];
      const curr = pnlData[i];
      if ((prev.pnl < 0 && curr.pnl >= 0) || (prev.pnl > 0 && curr.pnl <= 0)) {
        // Linear interpolation
        const ratio = Math.abs(prev.pnl) / (Math.abs(prev.pnl) + Math.abs(curr.pnl));
        const be = prev.price + (curr.price - prev.price) * ratio;
        breakevens.push(Number(be.toFixed(2)));
      }
    }

    // POP estimate: assume lognormal distribution, count % of prices where pnl > 0
    // Simplified: ~50% if symmetric, less if asymmetric
    const profitPoints = pnlData.filter(p => p.pnl > 0).length;
    const pop = Math.round((profitPoints / pnlData.length) * 1000) / 10;

    return {
      netPremium: netPremium * 100,
      maxLoss,
      maxProfit,
      breakevens,
      pop,
      riskReward: maxLoss < 0 ? Number((maxProfit / Math.abs(maxLoss)).toFixed(2)) : 0,
    };
  }, [legs, pnlData]);

  return (
    <Panel title={`Strategy Builder — ${selectedOption.symbol}`} icon={<Layers size={17} />}>
      <div className="space-y-4">
        {/* Strategy picker */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-terminal-muted mb-1.5 font-semibold">
            Zgjidh Strategjinë
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {STRATEGIES.map((s) => (
              <button
                key={s.key}
                onClick={() => setStrategy(s.key)}
                className={`rounded border px-2 py-1.5 text-[11px] font-semibold transition text-left ${
                  strategy === s.key
                    ? "border-terminal-cyan bg-terminal-cyan/10 text-terminal-cyan"
                    : "border-terminal-edge bg-black/20 text-terminal-muted hover:text-white"
                }`}
              >
                <div className="truncate">{s.name}</div>
                <div className="text-[9px] opacity-70 mt-0.5">{s.bias} · {s.legs} legs</div>
              </button>
            ))}
          </div>
        </div>

        {/* Strategy metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded border border-terminal-edge bg-black/20 p-2 text-center">
            <div className="text-[9px] text-terminal-muted uppercase">Max Profit</div>
            <div className="text-sm font-bold text-terminal-green">
              {metrics.maxProfit >= 0 ? "+" : ""}${metrics.maxProfit.toLocaleString()}
            </div>
          </div>
          <div className="rounded border border-terminal-edge bg-black/20 p-2 text-center">
            <div className="text-[9px] text-terminal-muted uppercase">Max Loss</div>
            <div className="text-sm font-bold text-red-400">
              ${metrics.maxLoss.toLocaleString()}
            </div>
          </div>
          <div className="rounded border border-terminal-edge bg-black/20 p-2 text-center">
            <div className="text-[9px] text-terminal-muted uppercase">R/R Ratio</div>
            <div className={`text-sm font-bold ${
              metrics.riskReward >= 2 ? "text-terminal-green" :
              metrics.riskReward >= 1 ? "text-terminal-amber" : "text-red-400"
            }`}>
              {metrics.riskReward.toFixed(2)}:1
            </div>
          </div>
          <div className="rounded border border-terminal-edge bg-black/20 p-2 text-center">
            <div className="text-[9px] text-terminal-muted uppercase">POP (est.)</div>
            <div className="text-sm font-bold text-terminal-cyan">
              {metrics.pop.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Breakevens */}
        <div className="rounded border border-terminal-edge bg-black/20 p-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-terminal-muted font-semibold">
            Breakeven{metrics.breakevens.length !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            {metrics.breakevens.length > 0 ? (
              metrics.breakevens.map((be, i) => (
                <span key={i} className="text-xs font-bold text-terminal-cyan">
                  ${be.toFixed(2)}
                </span>
              ))
            ) : (
              <span className="text-xs text-terminal-muted">No breakeven</span>
            )}
          </div>
        </div>

        {/* P&L diagram */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pnlData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis
                dataKey="price"
                stroke="#6b7280"
                fontSize={11}
                tickFormatter={(v) => `$${v}`}
                label={{ value: "Çmimi i aksionit", position: "insideBottom", offset: -2, fill: "#6b7280", fontSize: 10 }}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={11}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #1f2937",
                  borderRadius: "4px",
                  fontSize: "11px",
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "P&L"]}
                labelFormatter={(label: number) => `Çmimi: $${label}`}
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1} />

              {/* Current spot */}
              <ReferenceLine
                x={spot}
                stroke="#06b6d4"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{ value: `Spot $${spot}`, position: "top", fill: "#06b6d4", fontSize: 10 }}
              />

              {/* Breakevens */}
              {metrics.breakevens.map((be, i) => (
                <ReferenceLine
                  key={i}
                  x={be}
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  label={{ value: `BE $${be}`, position: "bottom", fill: "#f59e0b", fontSize: 9 }}
                />
              ))}

              <Line
                type="monotone"
                dataKey="pnl"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legs table */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-terminal-muted mb-1.5 font-semibold">
            Këmbët e Pozicionit
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-terminal-edge text-terminal-muted">
                  <th className="text-left py-1.5 px-2">Action</th>
                  <th className="text-left py-1.5 px-2">Type</th>
                  <th className="text-right py-1.5 px-2">Strike</th>
                  <th className="text-right py-1.5 px-2">Premium</th>
                  <th className="text-right py-1.5 px-2">Qty</th>
                  <th className="text-right py-1.5 px-2">Cost/Credit</th>
                </tr>
              </thead>
              <tbody>
                {legs.map((leg, i) => (
                  <tr key={i} className="border-b border-terminal-edge/30">
                    <td className="py-1.5 px-2">
                      <span className={`font-semibold ${leg.action === "buy" ? "text-terminal-green" : "text-terminal-amber"}`}>
                        {leg.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-terminal-text">{leg.type.toUpperCase()}</td>
                    <td className="text-right py-1.5 px-2 font-mono">${leg.strike}</td>
                    <td className="text-right py-1.5 px-2 font-mono">${leg.premium.toFixed(2)}</td>
                    <td className="text-right py-1.5 px-2 font-mono">{leg.qty}</td>
                    <td className={`text-right py-1.5 px-2 font-mono font-semibold ${
                      leg.action === "buy" ? "text-red-400" : "text-terminal-green"
                    }`}>
                      {leg.action === "buy" ? "-" : "+"}${(leg.premium * leg.qty * 100).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-terminal-edge">
                  <td colSpan={5} className="py-1.5 px-2 text-right font-semibold text-terminal-muted">
                    Net {metrics.netPremium >= 0 ? "Credit" : "Debit"}:
                  </td>
                  <td className={`text-right py-1.5 px-2 font-mono font-bold ${
                    metrics.netPremium >= 0 ? "text-terminal-green" : "text-red-400"
                  }`}>
                    {metrics.netPremium >= 0 ? "+" : "-"}${Math.abs(metrics.netPremium).toFixed(0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Strategy explanation */}
        <div className="rounded border border-terminal-edge bg-black/15 p-3 text-xs text-terminal-text/70 leading-5">
          <p className="font-semibold text-terminal-cyan mb-1">
            {STRATEGIES.find(s => s.key === strategy)?.name} — Si funksionon
          </p>
          <StrategyExplanation strategy={strategy} />
        </div>
      </div>
    </Panel>
  );
}

function StrategyExplanation({ strategy }: { strategy: StrategyKey }) {
  const explanations: Record<StrategyKey, string> = {
    long_call: "Blini 1 Call ATM. Fitim i pakufizuar nëse aksioni rritet. Humbje maksimale = premiumi. Bullish me rrezik të përcaktuar.",
    long_put: "Blini 1 Put ATM. Fitim i kufizuar (aksioni → 0). Humbje maksimale = premiumi. Bearish me rrezik të përcaktuar.",
    bull_call_spread: "Blini Call ATM + Shesni Call OTM. Koston më të ulët se Long Call, por fitimi kufizohet në strike i sipërm. Bullish me rrezik të përcaktuar.",
    bear_put_spread: "Blini Put ATM + Shesni Put OTM. Koston më të ulët se Long Put, por fitimi kufizohet në strike i poshtëm. Bearish me rrezik të përcaktuar.",
    iron_condor: "4 këmbë: Blini Put Far OTM + Shesni Put OTM + Shesni Call OTM + Blini Call Far OTM. Fitim nëse aksioni qëndron në rang. KREDIT strategy — mbledh premium.",
    butterfly: "3 këmbë (1-2-1): Bleni Call OTM + Shesni 2 Call ATM + Bleni Call ITM. Fitim maksimal nëse aksioni mbyllet afër ATM. Pin-risk strategy.",
    long_straddle: "Blini Call ATM + Bleni Put ATM (same strike). Fitim nëse aksioni lëviz ndjeshëm në cilëndo drejtim. Volkanozbiliiteti i lartë i dobishëm. Kosto e lartë.",
    long_strangle: "Blini Call OTM + Bleni Put OTM (out of money). Më e lirë se straddle, por kërkon lëvizje më të madhe. Volkanozbiliiteti ekstrem.",
  };
  return <p>{explanations[strategy]}</p>;
}
