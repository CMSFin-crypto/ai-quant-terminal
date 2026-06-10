"use client";

import { Activity, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from "recharts";
import type { TerminalOption } from "@/lib/workstation";
import { generateIVHVSeries, type IVHVPoint } from "@/lib/volAnalytics";
import { Panel } from "./Panel";
import { Metric } from "./Metric";
import { MiniStat } from "./MiniStat";

interface IVHVChartTabProps {
  selectedOption: TerminalOption;
}

export function IVHVChartTab({ selectedOption }: IVHVChartTabProps) {
  const data = generateIVHVSeries(selectedOption);
  const current = data[data.length - 1];
  const ivHvSpread = selectedOption.iv - selectedOption.historical.realizedVol30;
  const ivExpensive = ivHvSpread > 0.05;
  const ivCheap = ivHvSpread < -0.03;

  return (
    <Panel title="IV / HV Chart" icon={<Activity size={17} />}>
      {/* Key metrics */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-4">
        <Metric
          label="IV Aktuale"
          value={`${(selectedOption.iv * 100).toFixed(1)}%`}
          accent={ivExpensive ? "amber" : ivCheap ? "green" : "cyan"}
        />
        <Metric
          label="HV 30D"
          value={`${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}%`}
          accent="green"
        />
        <Metric
          label="IV/HV Spread"
          value={`${ivHvSpread > 0 ? "+" : ""}${(ivHvSpread * 100).toFixed(1)}%`}
          accent={ivExpensive ? "amber" : ivCheap ? "green" : "cyan"}
        />
        <Metric
          label="IV Rank"
          value={`${current?.ivRank ?? "--"}`}
          accent={(current?.ivRank ?? 0) > 70 ? "amber" : (current?.ivRank ?? 0) < 30 ? "green" : "cyan"}
        />
      </div>

      {/* IV/HV spread interpretation */}
      <div className={`mt-3 rounded border p-3 ${
        ivExpensive
          ? "border-terminal-amber/40 bg-terminal-amber/[0.08]"
          : ivCheap
            ? "border-terminal-green/40 bg-terminal-green/[0.08]"
            : "border-terminal-cyan/30 bg-terminal-cyan/[0.05]"
      }`}>
        <div className="flex items-center gap-2 mb-1.5">
          {ivExpensive ? (
            <TrendingUp size={15} className="text-terminal-amber" />
          ) : ivCheap ? (
            <TrendingDown size={15} className="text-terminal-green" />
          ) : (
            <BarChart3 size={15} className="text-terminal-cyan" />
          )}
          <span className={`text-xs font-bold ${
            ivExpensive ? "text-terminal-amber" : ivCheap ? "text-terminal-green" : "text-terminal-cyan"
          }`}>
            {ivExpensive ? "IV E LARTË — Opsionet janë të shtrenjta" : ivCheap ? "IV E ULËT — Opsionet janë të lira" : "IV NË NORMALE — Vlerësim i arsyeshëm"}
          </span>
        </div>
        <p className="text-xs leading-5 text-terminal-text/85">
          {ivExpensive
            ? `IV është ${(ivHvSpread * 100).toFixed(1)}% më e lartë se HV, çka do të thotë se tregu priton lëvizje të mëdha. Opsionet janë të shtrenjta — konsideroni shitjen e opsioneve (SELL CALL, SELL PUT, ose credit spreads) për të përfituar nga IV crush.`
            : ivCheap
              ? `IV është ${Math.abs(ivHvSpread * 100).toFixed(1)}% më e ulët se HV, çka do të thotë se opsionet janë relativisht të lira. Mund të jetë kohë e mirë për të blerë opsione (BUY CALL/PUT) sepse IV mund të rritet sërish.`
              : `IV dhe HV janë afër njëra-tjetrës, çka tregon se tregu po vlerëson volatilitetin në mënyrë të arsyeshme. Asnjë avantazh i qartë nga blerja apo shitja e opsioneve bazuar vetëm në IV/HV.`}
        </p>
      </div>

      {/* IV/HV Time Series Chart */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          IV vs HV — 12 Muaj
        </h3>
        <div className="h-[280px] sm:h-[340px] lg:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="ivGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5ee5ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5ee5ff" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="hv30Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#36f29b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#36f29b" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="hv90Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1a342e" vertical={false} />
              <XAxis dataKey="date" stroke="#8eb2a8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#8eb2a8" tick={{ fontSize: 10 }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#091916",
                  border: "1px solid rgba(94,229,255,0.3)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#e5e7eb"
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    iv: "IV",
                    hv30: "HV 30D",
                    hv90: "HV 90D"
                  };
                  return [`${value.toFixed(1)}%`, labels[name] || name];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    iv: "Implied Volatility (IV)",
                    hv30: "Historical Vol 30D (HV)",
                    hv90: "Historical Vol 90D (HV)"
                  };
                  return labels[value] || value;
                }}
              />
              <Area
                type="monotone"
                dataKey="iv"
                stroke="#5ee5ff"
                strokeWidth={2.5}
                fill="url(#ivGrad)"
              />
              <Area
                type="monotone"
                dataKey="hv30"
                stroke="#36f29b"
                strokeWidth={2}
                fill="url(#hv30Grad)"
              />
              <Area
                type="monotone"
                dataKey="hv90"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                fill="url(#hv90Grad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* IV Rank / Percentile chart */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          IV Rank & IV Percentile
        </h3>
        <div className="h-[160px] sm:h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#1a342e" vertical={false} />
              <XAxis dataKey="date" stroke="#8eb2a8" tick={{ fontSize: 10 }} />
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
                  const labels: Record<string, string> = {
                    ivRank: "IV Rank",
                    ivPercentile: "IV Percentile"
                  };
                  return [`${value}%`, labels[name] || name];
                }}
              />
              <Line type="monotone" dataKey="ivRank" stroke="#5ee5ff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ivPercentile" stroke="#a78bfa" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              <ReferenceLine y={50} stroke="#8eb2a8" strokeDasharray="3 3" strokeOpacity={0.4} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly detail table */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Treguesit Mujor
        </h3>
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-edge text-terminal-muted">
                <th className="py-2 px-2 text-left">Muaj</th>
                <th className="py-2 px-2 text-right">IV</th>
                <th className="py-2 px-2 text-right">HV 30D</th>
                <th className="py-2 px-2 text-right">HV 90D</th>
                <th className="py-2 px-2 text-right">Spread</th>
                <th className="py-2 px-2 text-right">IV Rank</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className={`border-b border-terminal-edge/50 ${i === data.length - 1 ? "bg-terminal-cyan/[0.06]" : ""}`}>
                  <td className="py-1.5 px-2 text-terminal-text">{row.date}</td>
                  <td className="py-1.5 px-2 text-right text-terminal-cyan">{row.iv.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-right text-terminal-green">{row.hv30.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-right text-terminal-amber">{row.hv90.toFixed(1)}%</td>
                  <td className={`py-1.5 px-2 text-right ${row.iv - row.hv30 > 5 ? "text-terminal-amber" : row.iv - row.hv30 < -3 ? "text-terminal-green" : "text-terminal-text"}`}>
                    {row.iv - row.hv30 > 0 ? "+" : ""}{(row.iv - row.hv30).toFixed(1)}%
                  </td>
                  <td className="py-1.5 px-2 text-right text-terminal-muted">{row.ivRank}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Educational note */}
      <div className="mt-3 rounded border border-terminal-edge bg-black/20 p-3 text-xs text-terminal-text/60 leading-5">
        <b>IV vs HV — Pse është e rëndësishme:</b> Kur IV është më e lartë se HV, tregu priton lëvizje më të mëdha se sa kanë ndodhur historikisht — opsionet janë të shtrenjta. Kur IV është më e ulët, opsionet janë të lira. IV Rank tregon se ku është IV aktual krahasuar me 12-mujorin (0 = më e ulët, 100 = më e lartë).
      </div>
    </Panel>
  );
}
