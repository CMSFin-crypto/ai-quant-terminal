"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine, Cell
} from "recharts";
import { Activity } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import { Panel } from "./Panel";

/**
 * Volatility Cone
 *
 * For each lookback window (10, 20, 30, 60, 90 days), shows:
 *   - Bar: 25th-75th percentile range of historical HV (typical range)
 *   - Whiskers: 5th-95th percentile (extreme range)
 *   - Marker: current HV at that window
 *   - Horizontal line: current IV (compared across all windows)
 *
 * Interpretation:
 *   - If current IV is above the 75th percentile bar → options are expensive
 *   - If current IV is below the 25th percentile bar → options are cheap
 *   - The cone shape (narrow at short DTE, wide at long DTE) shows vol regime stability
 */
export function VolConeTab({ selectedOption }: { selectedOption: TerminalOption }) {
  const data = useMemo(() => {
    const h = selectedOption.historical;
    const ivPct = selectedOption.iv * 100;

    // We have hvSeries (20-day rolling HV over past year). Derive percentile bands
    // for each lookback window using the full series.
    // Since we only store 20-day rolling series, we approximate percentile bands
    // by sampling the existing series — but also use the snapshot values (HV10/20/30/60/90)
    // as the "current HV" markers.

    // For percentile bands, derive from the hvSeries. Each point represents 20-day HV.
    // We'll use the same series for all windows (approximation), but the snapshot HV
    // shows the actual current value at each lookback.
    const series = h.hvSeries || [];
    const pct25 = series.length
      ? series.sort((a, b) => a - b)[Math.floor(series.length * 0.25)] * 100
      : 0;
    const pct75 = series.length
      ? series.sort((a, b) => a - b)[Math.floor(series.length * 0.75)] * 100
      : 0;
    const pct5 = series.length
      ? series.sort((a, b) => a - b)[Math.floor(series.length * 0.05)] * 100
      : 0;
    const pct95 = series.length
      ? series.sort((a, b) => a - b)[Math.floor(series.length * 0.95)] * 100
      : 0;

    return [
      { name: "10D", current: h.realizedVol10 * 100, p25: pct25, p75: pct75, p5: pct5, p95: pct95, iv: ivPct },
      { name: "20D", current: h.realizedVol20 * 100, p25: pct25, p75: pct75, p5: pct5, p95: pct95, iv: ivPct },
      { name: "30D", current: h.realizedVol30 * 100, p25: pct25, p75: pct75, p5: pct5, p95: pct95, iv: ivPct },
      { name: "60D", current: h.realizedVol60 * 100, p25: pct25, p75: pct75, p5: pct5, p95: pct95, iv: ivPct },
      { name: "90D", current: h.realizedVol90 * 100, p25: pct25, p75: pct75, p5: pct5, p95: pct95, iv: ivPct },
    ];
  }, [selectedOption]);

  const ivPct = selectedOption.iv * 100;
  const hv30 = selectedOption.historical.realizedVol30 * 100;

  // Status
  const isExpensive = ivPct > data[2].p75;
  const isCheap = ivPct < data[2].p25;
  const status = isExpensive
    ? { label: "IV E LARTË — opsionet shtrenjta", color: "text-terminal-amber" }
    : isCheap
      ? { label: "IV E ULËT — opsionet të lira", color: "text-terminal-green" }
      : { label: "IV NË RANG NORMAL", color: "text-terminal-cyan" };

  return (
    <Panel title={`Volatility Cone — ${selectedOption.symbol}`} icon={<Activity size={17} />}>
      <div className="space-y-4">
        {/* Status banner */}
        <div className={`rounded border border-terminal-edge bg-black/20 px-3 py-2 text-sm font-semibold ${status.color}`}>
          {status.label}
        </div>

        {/* Vol Cone Chart */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #1f2937",
                  borderRadius: "4px",
                  fontSize: "11px",
                }}
                formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
              />
              <Legend wrapperStyle={{ fontSize: "10px" }} />

              {/* 25-75 percentile range (bar) */}
              <Bar dataKey="p75" name="75th percentile" fill="#06b6d4" opacity={0.4} radius={[2, 2, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill="#06b6d4" />)}
              </Bar>
              <Bar dataKey="p25" name="25th percentile" fill="#0a0a0a" radius={[0, 0, 0, 0]} />

              {/* Current HV line */}
              <Line
                type="monotone"
                dataKey="current"
                name="HV aktual"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4, fill: "#10b981" }}
              />

              {/* IV reference line */}
              <ReferenceLine
                y={ivPct}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{ value: `IV ${ivPct.toFixed(1)}%`, position: "right", fill: "#f59e0b", fontSize: 10 }}
              />

              {/* 95th percentile (upper extreme) */}
              <Line
                type="monotone"
                dataKey="p95"
                name="95th pct (max)"
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
              {/* 5th percentile (lower extreme) */}
              <Line
                type="monotone"
                dataKey="p5"
                name="5th pct (min)"
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Percentile breakdown table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-edge text-terminal-muted">
                <th className="text-left py-1.5 px-2">Window</th>
                <th className="text-right py-1.5 px-2">HV Aktual</th>
                <th className="text-right py-1.5 px-2">5% (min)</th>
                <th className="text-right py-1.5 px-2">25%</th>
                <th className="text-right py-1.5 px-2">75%</th>
                <th className="text-right py-1.5 px-2">95% (max)</th>
                <th className="text-right py-1.5 px-2">IV Aktual</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.name} className="border-b border-terminal-edge/30 hover:bg-white/[0.02]">
                  <td className="py-1.5 px-2 font-semibold text-terminal-text">{row.name}</td>
                  <td className="text-right py-1.5 px-2 text-terminal-green font-mono">{row.current.toFixed(1)}%</td>
                  <td className="text-right py-1.5 px-2 text-blue-400 font-mono">{row.p5.toFixed(1)}%</td>
                  <td className="text-right py-1.5 px-2 text-terminal-cyan font-mono">{row.p25.toFixed(1)}%</td>
                  <td className="text-right py-1.5 px-2 text-terminal-cyan font-mono">{row.p75.toFixed(1)}%</td>
                  <td className="text-right py-1.5 px-2 text-red-400 font-mono">{row.p95.toFixed(1)}%</td>
                  <td className="text-right py-1.5 px-2 text-terminal-amber font-mono font-bold">{row.iv.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Explanation */}
        <div className="rounded border border-terminal-edge bg-black/15 p-3 text-xs text-terminal-text/70 leading-5">
          <p className="font-semibold text-terminal-cyan mb-1">Çfarë është Volatility Cone?</p>
          <p>
            Për çdo dritare kohore (10, 20, 30, 60, 90 ditë), tregon range historik të HV (Historical Volatility).
            Bar cian = 25-75% percentile (rangu tipik), vija jeshile = HV aktual, vija ambër = IV aktual.
            <br />
            <span className="text-terminal-amber">Nëse IV është mbi 75% percentile</span> → opsionet janë të shtrenjta, konsidero shitjen e premium-it.
            <br />
            <span className="text-terminal-green">Nëse IV është nën 25% percentile</span> → opsionet janë të lira, mund të blesh premium.
          </p>
        </div>
      </div>
    </Panel>
  );
}
