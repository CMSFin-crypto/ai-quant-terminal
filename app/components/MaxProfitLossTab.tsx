"use client";

import { Scale, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import type { TerminalOption } from "@/lib/workstation";
import { calculateMaxProfitLoss, type MaxProfitLoss } from "@/lib/volAnalytics";
import { Panel } from "./Panel";
import { MiniStat } from "./MiniStat";

interface MaxProfitLossTabProps {
  selectedOption: TerminalOption;
}

export function MaxProfitLossTab({ selectedOption }: MaxProfitLossTabProps) {
  const strategies = calculateMaxProfitLoss(selectedOption);
  const spot = selectedOption.underlyingPrice;

  return (
    <Panel title="Max Profit / Loss — Para se të Hyni" icon={<Scale size={17} />}>
      {/* Warning */}
      <div className="rounded border border-terminal-amber/40 bg-terminal-amber/[0.08] p-3 flex items-start gap-2.5">
        <AlertTriangle size={15} className="text-terminal-amber shrink-0 mt-0.5" />
        <div>
          <span className="text-xs font-bold text-terminal-amber">Pse është e rëndësishme:</span>
          <p className="text-xs leading-5 text-terminal-text/85 mt-1">
            Para se të hyni në ndonjë pozicion, duhet të dini saktësisht sa mund të fitoni dhe sa mund të humbni.
            Kjo nuk është parashikim — është matematikë. P&L në skadim tregon rezultatin e saktë për çdo çmim të mundshëm.
          </p>
        </div>
      </div>

      {/* Strategy P&L diagrams */}
      <div className="mt-4 space-y-5">
        {strategies.map((s, i) => (
          <StrategyPLCard key={i} strategy={s} spot={spot} symbol={selectedOption.symbol} />
        ))}
      </div>

      {/* Summary comparison */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Krahasimi i Strategjive
        </h3>
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-edge text-terminal-muted">
                <th className="py-2 px-2 text-left">Strategjia</th>
                <th className="py-2 px-2 text-right">Fitim Maks</th>
                <th className="py-2 px-2 text-right">Humbje Maks</th>
                <th className="py-2 px-2 text-right">Break Even</th>
                <th className="py-2 px-2 text-left">Fiton Kur</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((s, i) => (
                <tr key={i} className="border-b border-terminal-edge/50">
                  <td className="py-1.5 px-2 text-white font-medium">{s.strategy}</td>
                  <td className="py-1.5 px-2 text-right text-terminal-green">
                    {s.maxProfit >= 0 ? "+" : ""}${s.maxProfit.toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2 text-right text-red-400">
                    ${Math.abs(s.maxLoss).toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2 text-right text-terminal-cyan">
                    ${s.breakEven.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-2 text-terminal-text/75">{s.profitRegion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Educational note */}
      <div className="mt-3 rounded border border-terminal-edge bg-black/20 p-3 text-xs text-terminal-text/60 leading-5">
        <b>P&L në Skadim:</b> Këto diagrama tregojnë fitimin ose humbjen e saktë nëse mbani pozicionin deri në skadim. Para skadimit, vlera e opsionit ndryshon bazuar në kohën e mbetur (theta), volatilitetin (vega), dhe lëvizjen e çmimit (delta). Fitimi real mund të jetë më i lartë ose më i ulët nëse mbyllni para skadimit.
      </div>
    </Panel>
  );
}

function StrategyPLCard({ strategy, spot, symbol }: { strategy: MaxProfitLoss; spot: number; symbol: string }) {
  const isNetCredit = strategy.strategy.includes("Covered") || strategy.strategy.includes("Cash-Secured");

  return (
    <div className="rounded border border-terminal-edge bg-black/20 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign size={15} className="text-terminal-cyan" />
          <span className="text-sm font-bold text-white">{strategy.strategy}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-terminal-green">
            <TrendingUp size={12} className="inline mr-1" />
            +${strategy.maxProfit.toLocaleString()}
          </span>
          <span className="text-xs font-bold text-red-400">
            <TrendingDown size={12} className="inline mr-1" />
            -${Math.abs(strategy.maxLoss).toLocaleString()}
          </span>
        </div>
      </div>

      {/* P&L at expiration chart */}
      <div className="h-[200px] sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={strategy.points} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#36f29b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#36f29b" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1a342e" vertical={false} />
            <XAxis
              dataKey="price"
              stroke="#8eb2a8"
              tick={{ fontSize: 9 }}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              interval={9}
            />
            <YAxis
              stroke="#8eb2a8"
              tick={{ fontSize: 9 }}
              tickFormatter={(v: number) => `$${v.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#091916",
                border: "1px solid rgba(94,229,255,0.3)",
                borderRadius: 8,
                fontSize: 11,
                color: "#e5e7eb"
              }}
              formatter={(value: number) => [`${value >= 0 ? "+" : ""}$${value.toLocaleString()}`, "P&L në Skadim"]}
              labelFormatter={(label: number) => `Çmimi: $${label.toFixed(2)}`}
            />
            <ReferenceLine y={0} stroke="#8eb2a8" strokeDasharray="3 3" strokeOpacity={0.6} />
            <ReferenceLine
              x={spot}
              stroke="#5ee5ff"
              strokeDasharray="4 2"
              strokeOpacity={0.7}
              label={{ value: `Undl $${spot.toFixed(0)}`, position: "top", fill: "#5ee5ff", fontSize: 9 }}
            />
            <ReferenceLine
              x={strategy.breakEven}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              label={{ value: `BE $${strategy.breakEven.toFixed(0)}`, position: "top", fill: "#f59e0b", fontSize: 8 }}
            />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke="#5ee5ff"
              strokeWidth={2}
              fill={isNetCredit ? "url(#profitGrad)" : "url(#lossGrad)"}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick metrics */}
      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2">
        <MiniStat label="Break Even" value={`$${strategy.breakEven}`} symbol={symbol} />
        <MiniStat label="Fiton Kur" value={strategy.profitRegion} symbol={symbol} />
        <MiniStat label="Humb Kur" value={strategy.lossRegion} symbol={symbol} />
      </div>

      {/* Explanation */}
      <p className="mt-2 text-xs leading-5 text-terminal-text/70">{strategy.explanationAl}</p>
    </div>
  );
}
