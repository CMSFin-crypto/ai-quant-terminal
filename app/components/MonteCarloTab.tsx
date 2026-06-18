"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import type { TerminalOption } from "@/lib/workstation";
import { Panel } from "./Panel";
import { MiniStat } from "./MiniStat";
import { TrendingUp, TrendingDown, ShieldAlert, Target } from "lucide-react";

interface MonteCarloTabProps {
  selectedOption: TerminalOption;
}

export function MonteCarloTab({ selectedOption }: MonteCarloTabProps) {
  const mc = selectedOption.mc;
  const spot = selectedOption.underlyingPrice;
  const pct = mc.percentiles;

  // Calculate risk metrics
  const varDollar = spot - mc.var5;
  const varPercent = ((spot - mc.var5) / spot * 100);
  const maxGainDollar = mc.p95 - spot;
  const maxGainPercent = ((mc.p95 - spot) / spot * 100);
  const riskRewardRatio = maxGainDollar / Math.max(varDollar, 0.01);

  return (
    <Panel title="Monte Carlo Simulation" icon={<Target size={17} />}>
      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-4">
        <MiniStat label="Simulime" value="5,000" symbol={selectedOption.symbol} />
        <MiniStat label="DITË" value={`${selectedOption.dte || 30}d`} symbol={selectedOption.symbol} />
        <MiniStat label="Bullish" value={`${mc.bullish.toFixed(1)}%`} symbol={selectedOption.symbol} />
        <MiniStat label="Bearish" value={`${mc.bearish.toFixed(1)}%`} symbol={selectedOption.symbol} />
      </div>

      {/* Expected Return & VaR */}
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-4">
        <MiniStat label="Kthim i Pritur" value={`${mc.expectedReturn >= 0 ? '+' : ''}${mc.expectedReturn.toFixed(1)}%`} symbol={selectedOption.symbol} />
        <MiniStat label="VaR 5%" value={`-$${varDollar.toFixed(0)} (${varPercent.toFixed(1)}%)`} symbol={selectedOption.symbol} />
        <MiniStat label="Fitim Maks" value={`+$${maxGainDollar.toFixed(0)} (${maxGainPercent.toFixed(1)}%)`} symbol={selectedOption.symbol} />
        <MiniStat label="Risk/Reward" value={`${riskRewardRatio.toFixed(2)}:1`} symbol={selectedOption.symbol} />
      </div>

      {/* Distribution Chart */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Distribucioni i Çmimeve në Skadim
        </h3>
        <div className="h-[260px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mc.histogram} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
              <XAxis
                dataKey="bin"
                tick={{ fill: "#6b7280", fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                interval={2}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 10 }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#091916",
                  border: "1px solid rgba(94,229,255,0.3)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#e5e7eb"
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, "Probabilitet"]}
                labelFormatter={(label: string) => `Çmimi: ${label}`}
              />
              <ReferenceLine
                x={mc.histogram.findIndex((b) => {
                  const binVal = parseFloat(b.bin.replace("$", ""));
                  return binVal >= spot;
                })}
                stroke="#5ee5ff"
                strokeDasharray="3 3"
                label={{ value: `Undl $${spot.toFixed(0)}`, position: "top", fill: "#5ee5ff", fontSize: 10 }}
              />
              <Bar dataKey="pct" radius={[2, 2, 0, 0]}>
                {mc.histogram.map((entry, index) => {
                  const binVal = parseFloat(entry.bin.replace("$", ""));
                  const isATM = Math.abs(binVal - spot) < (spot * 0.05);
                  const isITM = selectedOption.type === "call" ? binVal > spot : binVal < spot;
                  return (
                    <Cell
                      key={index}
                      fill={isATM ? "#5ee5ff" : isITM ? "#36f29b" : "#f59e0b"}
                      fillOpacity={0.7 + entry.pct * 0.03}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Percentile table */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Përqindjet e Çmimit në Skadim
        </h3>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:grid-cols-5">
          <MiniStat label="P1 (Më keq)" value={`$${pct.p1.toFixed(0)}`} symbol={selectedOption.symbol} />
          <MiniStat label="P5 (VaR)" value={`$${pct.p5.toFixed(0)}`} symbol={selectedOption.symbol} />
          <MiniStat label="P25" value={`$${pct.p25.toFixed(0)}`} symbol={selectedOption.symbol} />
          <MiniStat label="P50 (Median)" value={`$${pct.p50.toFixed(0)}`} symbol={selectedOption.symbol} />
          <MiniStat label="P75" value={`$${pct.p75.toFixed(0)}`} symbol={selectedOption.symbol} />
          <MiniStat label="P90" value={`$${pct.p90.toFixed(0)}`} symbol={selectedOption.symbol} />
          <MiniStat label="P95 (Maks)" value={`$${pct.p95.toFixed(0)}`} symbol={selectedOption.symbol} />
          <MiniStat label="P99" value={`$${pct.p99.toFixed(0)}`} symbol={selectedOption.symbol} />
          <MiniStat label="Mesatarja" value={`$${mc.avg.toFixed(0)}`} symbol={selectedOption.symbol} />
        </div>
      </div>

      {/* Scenario Analysis */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Analiza e Skenarëve
        </h3>
        <div className="space-y-2">
          {/* Bear scenario */}
          <div className="flex items-center gap-2 rounded border border-red-500/30 bg-red-500/[0.06] p-2.5">
            <TrendingDown size={16} className="text-red-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-red-400">Skenari Bear (5% më keq)</div>
              <div className="text-xs text-terminal-text/80 mt-0.5">
                Çmimi bie në $${pct.p5.toFixed(0)} ose më ulët. Humbja potenciale: -$${varDollar.toFixed(0)} ({varPercent.toFixed(1)}%).
                Për {selectedOption.type === "call" ? "Call" : "Put"}, opsioni {selectedOption.type === "call" ? "humbet vlerë" : "fiton vlerë"}.
              </div>
            </div>
          </div>

          {/* Base scenario */}
          <div className="flex items-center gap-2 rounded border border-terminal-cyan/30 bg-terminal-cyan/[0.06] p-2.5">
            <Target size={16} className="text-terminal-cyan shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-terminal-cyan">Skenari Bazë (50% probabilitet)</div>
              <div className="text-xs text-terminal-text/80 mt-0.5">
                Çmimi mesatar pritet të jetë $${mc.avg.toFixed(0)} (median $${pct.p50.toFixed(0)}).
                Kthimi i pritur: {mc.expectedReturn >= 0 ? "+" : ""}{mc.expectedReturn.toFixed(1)}%.
              </div>
            </div>
          </div>

          {/* Bull scenario */}
          <div className="flex items-center gap-2 rounded border border-terminal-green/30 bg-terminal-green/[0.06] p-2.5">
            <TrendingUp size={16} className="text-terminal-green shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-terminal-green">Skenari Bull (5% më mirë)</div>
              <div className="text-xs text-terminal-text/80 mt-0.5">
                Çmimi ngrihet në $${pct.p95.toFixed(0)} ose më lart. Fitimi potencial: +$${maxGainDollar.toFixed(0)} ({maxGainPercent.toFixed(1)}%).
                Për {selectedOption.type === "call" ? "Call" : "Put"}, opsioni {selectedOption.type === "call" ? "fiton vlerë" : "humbet vlerë"}.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Greeks Sensitivity */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Ndjeshmëria e Grekëve (Greeks Sensitivity)
        </h3>
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
          <MiniStat label="Delta" value={selectedOption.delta.toFixed(2)} symbol={selectedOption.symbol} />
          <MiniStat label="Gamma" value={selectedOption.gamma.toFixed(3)} symbol={selectedOption.symbol} />
          <MiniStat label="Theta" value={selectedOption.theta.toFixed(3)} symbol={selectedOption.symbol} />
          <MiniStat label="Vega" value={selectedOption.vega.toFixed(4)} symbol={selectedOption.symbol} />
          <MiniStat label="IV" value={`${(selectedOption.iv * 100).toFixed(1)}%`} symbol={selectedOption.symbol} />
          <MiniStat label="POP" value={`${selectedOption.profitProbability.toFixed(1)}%`} symbol={selectedOption.symbol} />
        </div>
        <div className="mt-2 rounded border border-terminal-edge bg-black/20 p-2.5 text-xs text-terminal-text/70 leading-5">
          <b>Delta {selectedOption.delta.toFixed(2)}</b> → Nëse aksioni lëviz $1, opsioni lëviz ${Math.abs(selectedOption.delta).toFixed(2)}.
          {" "}<b>Gamma {selectedOption.gamma.toFixed(3)}</b> → Delta ndryshon me {selectedOption.gamma.toFixed(3)} për çdo $1 lëvizje.
          {" "}<b>Theta {selectedOption.theta.toFixed(3)}</b> → Opsioni humbet ${Math.abs(selectedOption.theta).toFixed(3)}/ditë nga kalimi i kohës.
          {" "}<b>Vega {selectedOption.vega.toFixed(4)}</b> → Nëse IV ndryshon 1%, opsioni ndryshon ${selectedOption.vega.toFixed(4)}.
        </div>
      </div>

      {/* Methodology note */}
      <div className="mt-3 text-[10px] text-terminal-muted/50 leading-4">
        Simulimi Monte Carlo me 5,000 shtigje GBM (Geometric Brownian Motion) me volatilitet {(selectedOption.iv * 100).toFixed(1)}%
        dhe normë pa rrezik 4.3%. Rezultatet janë statistikore, jo garanci.
      </div>
    </Panel>
  );
}
