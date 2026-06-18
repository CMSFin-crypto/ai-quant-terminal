"use client";

import { Calculator, TrendingUp, TrendingDown, Target, AlertTriangle, Info } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from "recharts";
import type { TerminalOption } from "@/lib/workstation";
import { calculatePOP, type POPResult } from "@/lib/volAnalytics";
import { Panel } from "./Panel";
import { MiniStat } from "./MiniStat";

interface POPCalculatorTabProps {
  selectedOption: TerminalOption;
}

export function POPCalculatorTab({ selectedOption }: POPCalculatorTabProps) {
  const strategies = calculatePOP(selectedOption);

  return (
    <Panel title="POP Calculator — Probabiliteti i Fitimit" icon={<Calculator size={17} />}>
      {/* Header explanation */}
      <div className="rounded border border-terminal-cyan/30 bg-terminal-cyan/[0.06] p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Info size={14} className="text-terminal-cyan" />
          <span className="text-xs font-bold text-terminal-cyan">Çfarë është POP?</span>
        </div>
        <p className="text-xs leading-5 text-terminal-text/85">
          POP (Probability of Profit) tregon sa probabël është që pozicioni juaj të jetë fitimprurës në skadim. Kjo nuk është garanci — është probabilitet statistikor bazuar në simulime Monte Carlo dhe modelin Black-Scholes. Sa më i lartë POP, aq më i madh shansi i fitimit, por fitimi potencial është zakonisht më i vogël.
        </p>
      </div>

      {/* POP comparison chart */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          POP sipas Strategjisë
        </h3>
        <div className="h-[220px] sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={strategies.map(s => ({ name: s.strategy, pop: s.pop, popAtExpiry: s.popAtExpiry }))} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid stroke="#1a342e" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#8eb2a8"
                tick={{ fontSize: 9 }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis stroke="#8eb2a8" tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#091916",
                  border: "1px solid rgba(94,229,255,0.3)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#e5e7eb"
                }}
                formatter={(value: number, name: string) => {
                  return [`${value.toFixed(1)}%`, name === "pop" ? "POP (me kohë)" : "POP (në skadim)"];
                }}
              />
              <ReferenceLine y={50} stroke="#8eb2a8" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: "50%", position: "left", fill: "#8eb2a8", fontSize: 9 }} />
              <Bar dataKey="pop" radius={[3, 3, 0, 0]} name="pop">
                {strategies.map((s, i) => (
                  <Cell
                    key={i}
                    fill={s.pop >= 65 ? "#36f29b" : s.pop >= 45 ? "#5ee5ff" : s.pop >= 30 ? "#f59e0b" : "#ef4444"}
                    fillOpacity={0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategy cards */}
      <div className="mt-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted">
          Detaje për Çdo Strategji
        </h3>
        {strategies.map((s, i) => (
          <StrategyPOPCard key={i} strategy={s} symbol={selectedOption.symbol} />
        ))}
      </div>

      {/* Key insight */}
      <div className="mt-3 rounded border border-terminal-edge bg-black/20 p-3 text-xs text-terminal-text/60 leading-5">
        <b>Rregull i Rëndësishëm:</b> POP i lartë nuk do të thotë domosdoshmërisht tregti më e mirë. Covered Call ka POP shumë të lartë (70-80%), por fitimi potencial është i kufizuar. Long Call ka POP më të ulët (30-45%), por fitimi potencial është i pakufizuar. Gjithmonë konsideroni Risk/Reward bashkë me POP.
      </div>
    </Panel>
  );
}

function StrategyPOPCard({ strategy, symbol }: { strategy: POPResult; symbol: string }) {
  const popColor = strategy.pop >= 65 ? "green" : strategy.pop >= 45 ? "cyan" : strategy.pop >= 30 ? "amber" : "red";

  return (
    <div className={`rounded border p-3 ${
      popColor === "green" ? "border-terminal-green/40 bg-terminal-green/[0.06]" :
      popColor === "cyan" ? "border-terminal-cyan/30 bg-terminal-cyan/[0.05]" :
      popColor === "amber" ? "border-terminal-amber/30 bg-terminal-amber/[0.06]" :
      "border-red-500/30 bg-red-500/[0.06]"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {strategy.pop >= 50 ? (
            <TrendingUp size={15} className={popColor === "green" ? "text-terminal-green" : "text-terminal-cyan"} />
          ) : (
            <TrendingDown size={15} className={popColor === "amber" ? "text-terminal-amber" : "text-red-400"} />
          )}
          <span className="text-sm font-bold text-white">{strategy.strategy}</span>
        </div>
        <span className={`text-sm font-bold ${
          popColor === "green" ? "text-terminal-green" :
          popColor === "cyan" ? "text-terminal-cyan" :
          popColor === "amber" ? "text-terminal-amber" :
          "text-red-400"
        }`}>
          POP: {strategy.pop}%
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-4">
        <MiniStat label="POP në Skadim" value={`${strategy.popAtExpiry}%`} symbol={symbol} />
        <MiniStat label="Fitim Maks" value={`$${strategy.maxProfit.toLocaleString()}`} symbol={symbol} />
        <MiniStat label="Humbje Maks" value={`$${Math.abs(strategy.maxLoss).toLocaleString()}`} symbol={symbol} />
        <MiniStat label="Risk/Reward" value={`${strategy.riskRewardRatio}:1`} symbol={symbol} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
        <MiniStat label="Break Even" value={`$${strategy.breakEven}`} symbol={symbol} />
        <MiniStat label="Fitim Mes." value={`$${strategy.avgProfit.toLocaleString()}`} symbol={symbol} />
        <MiniStat label="Humbje Mes." value={`$${Math.abs(strategy.avgLoss).toLocaleString()}`} symbol={symbol} />
      </div>

      {/* POP bar */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[10px] text-terminal-muted mb-1">
          <span>0%</span>
          <span>POP: {strategy.pop}%</span>
          <span>100%</span>
        </div>
        <div className="h-2 rounded-full bg-black/40 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              popColor === "green" ? "bg-terminal-green" :
              popColor === "cyan" ? "bg-terminal-cyan" :
              popColor === "amber" ? "bg-terminal-amber" :
              "bg-red-500"
            }`}
            style={{ width: `${strategy.pop}%` }}
          />
        </div>
      </div>

      {/* Explanation */}
      <p className="mt-2 text-xs leading-5 text-terminal-text/75">{strategy.explanationAl}</p>
    </div>
  );
}
