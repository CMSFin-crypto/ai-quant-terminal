"use client";

import { useState, useMemo } from "react";
import {
  History,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Play
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from "recharts";
import type { TerminalOption } from "@/lib/workstation";
import {
  runBacktest,
  runAllBacktests,
  type BacktestStrategy,
  type BacktestResult,
  type TradeResult
} from "@/lib/backtestEngine";
import { Panel } from "./Panel";
import { Metric } from "./Metric";

interface BacktestTabProps {
  selectedOption: TerminalOption;
}

const ALL_STRATEGIES: BacktestStrategy[] = [
  "Long Call",
  "Long Put",
  "Covered Call",
  "Cash-Secured Put",
  "Call Debit Spread",
  "Put Credit Spread",
  "Iron Condor",
  "Straddle"
];

const STRATEGY_COLORS: Record<BacktestStrategy, string> = {
  "Long Call": "#36f29b",
  "Long Put": "#f59e0b",
  "Covered Call": "#5ee5ff",
  "Cash-Secured Put": "#a78bfa",
  "Call Debit Spread": "#22d3ee",
  "Put Credit Spread": "#fb923c",
  "Iron Condor": "#818cf8",
  "Straddle": "#f472b6"
};

const HOLD_PERIODS = [
  { label: "7 Ditë", days: 7 },
  { label: "14 Ditë", days: 14 },
  { label: "30 Ditë", days: 30 },
  { label: "45 Ditë", days: 45 },
  { label: "60 Ditë", days: 60 }
];

export function BacktestTab({ selectedOption }: BacktestTabProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<BacktestStrategy>("Covered Call");
  const [holdDays, setHoldDays] = useState(30);
  const [showAllTrades, setShowAllTrades] = useState(false);

  // Run backtest for selected strategy with current hold period
  const result = useMemo(
    () => runBacktest(selectedOption, selectedStrategy, holdDays),
    [selectedOption, selectedStrategy, holdDays]
  );

  // Run all strategies for comparison
  const allResults = useMemo(
    () => runAllBacktests(selectedOption),
    [selectedOption]
  );

  // Comparison chart data: Win Rate and Total P&L per strategy
  const comparisonData = allResults.map(r => ({
    name: r.strategy.length > 12 ? r.strategy.substring(0, 12) + "…" : r.strategy,
    fullName: r.strategy,
    winRate: r.winRate,
    totalPnL: r.totalPnL,
    sharpe: r.sharpeRatio,
    profitFactor: r.profitFactor,
    color: STRATEGY_COLORS[r.strategy]
  }));

  // Trades table (show first 5 or all)
  const displayedTrades = showAllTrades ? result.trades : result.trades.slice(0, 5);

  return (
    <Panel title="Backtesting — Testo Strategjitë me Të Dhëna Historike" icon={<History size={17} />}>
      {/* Strategy & Hold Period Selection */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Strategy selector */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] uppercase tracking-widest text-terminal-muted mb-1.5">
            Strategjia
          </label>
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value as BacktestStrategy)}
            className="w-full rounded border border-terminal-edge bg-black/30 px-2.5 py-2 text-xs text-white focus:border-terminal-cyan focus:outline-none"
          >
            {ALL_STRATEGIES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Hold period selector */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] uppercase tracking-widest text-terminal-muted mb-1.5">
            Periudha e Mbajtjes
          </label>
          <div className="flex gap-1">
            {HOLD_PERIODS.map(hp => (
              <button
                key={hp.days}
                onClick={() => setHoldDays(hp.days)}
                className={`flex-1 rounded border px-1.5 py-2 text-[10px] font-semibold transition ${
                  holdDays === hp.days
                    ? "border-terminal-cyan bg-terminal-cyan/15 text-terminal-cyan"
                    : "border-terminal-edge bg-black/20 text-terminal-muted hover:text-white"
                }`}
              >
                {hp.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key metrics for selected strategy */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 mb-4">
        <Metric label="Total Trades" value={`${result.totalTrades}`} accent="cyan" />
        <Metric label="Win Rate" value={`${result.winRate.toFixed(1)}%`} accent={result.winRate >= 60 ? "green" : result.winRate >= 45 ? "cyan" : "amber"} />
        <Metric label="Total P&L" value={`$${result.totalPnL.toLocaleString()}`} accent={result.totalPnL > 0 ? "green" : "amber"} />
        <Metric label="Profit Factor" value={result.profitFactor.toFixed(2)} accent={result.profitFactor > 1.5 ? "green" : result.profitFactor > 1.0 ? "cyan" : "amber"} />
        <Metric label="Sharpe Ratio" value={result.sharpeRatio.toFixed(2)} accent={result.sharpeRatio > 1.0 ? "green" : result.sharpeRatio > 0 ? "cyan" : "amber"} />
        <Metric label="Max Drawdown" value={`$${Math.abs(result.maxDrawdown).toLocaleString()}`} accent="amber" />
        <Metric label="Best Trade" value={`$${result.bestTrade.toLocaleString()}`} accent="green" />
        <Metric label="Worst Trade" value={`$${result.worstTrade.toLocaleString()}`} accent="amber" />
      </div>

      {/* Strategy performance verdict */}
      <div className={`rounded border p-3 mb-4 ${
        result.profitFactor > 2 && result.winRate > 55
          ? "border-terminal-green/40 bg-terminal-green/[0.08]"
          : result.profitFactor > 1.2 && result.winRate > 45
            ? "border-terminal-cyan/30 bg-terminal-cyan/[0.05]"
            : "border-terminal-amber/30 bg-terminal-amber/[0.05]"
      }`}>
        <div className="flex items-center gap-2 mb-1.5">
          {result.profitFactor > 1.5 ? (
            <TrendingUp size={14} className="text-terminal-green" />
          ) : result.profitFactor > 1.0 ? (
            <BarChart3 size={14} className="text-terminal-cyan" />
          ) : (
            <TrendingDown size={14} className="text-terminal-amber" />
          )}
          <span className={`text-xs font-bold ${
            result.profitFactor > 2 && result.winRate > 55
              ? "text-terminal-green"
              : result.profitFactor > 1.2 && result.winRate > 45
                ? "text-terminal-cyan"
                : "text-terminal-amber"
          }`}>
            {result.profitFactor > 2 && result.winRate > 55
              ? "PERFORMANCË E MIRË HISTORIKISHT"
              : result.profitFactor > 1.2 && result.winRate > 45
                ? "PERFORMANCË MESATARE — Varet nga regjimi i tregut"
                : "PERFORMANCË E DOBËT — Kujdes me këtë strategji"}
          </span>
        </div>
        <p className="text-xs leading-5 text-terminal-text/85">
          {result.explanationAl}
        </p>
      </div>

      {/* Equity Curve */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Kurba e Kapitalit — Equity Curve ({selectedStrategy})
        </h3>
        <div className="h-[260px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={result.equityCurve} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={result.totalPnL >= 0 ? "#36f29b" : "#f59e0b"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={result.totalPnL >= 0 ? "#36f29b" : "#f59e0b"} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1a342e" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#8eb2a8"
                tick={{ fontSize: 9 }}
                interval={Math.max(0, Math.floor(result.equityCurve.length / 8))}
              />
              <YAxis
                stroke="#8eb2a8"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#091916",
                  border: "1px solid rgba(94,229,255,0.3)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#e5e7eb"
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Kapitali"]}
              />
              <ReferenceLine y={0} stroke="#8eb2a8" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={result.totalPnL >= 0 ? "#36f29b" : "#f59e0b"}
                strokeWidth={2}
                fill="url(#equityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── All Strategies Comparison ──────────────────────────────── */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Krahasimi i Strategjive — Win Rate
        </h3>
        <div className="h-[280px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }} layout="vertical">
              <CartesianGrid stroke="#1a342e" horizontal={false} />
              <XAxis
                type="number"
                stroke="#8eb2a8"
                tick={{ fontSize: 10 }}
                unit="%"
                domain={[0, 100]}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#8eb2a8"
                tick={{ fontSize: 9 }}
                width={95}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#091916",
                  border: "1px solid rgba(94,229,255,0.3)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#e5e7eb"
                }}
                formatter={(value: number, name: string) => {
                  if (name === "winRate") return [`${value.toFixed(1)}%`, "Win Rate"];
                  return [value, name];
                }}
                labelFormatter={(label: string) => {
                  const item = comparisonData.find(d => d.name === label);
                  return item?.fullName || label;
                }}
              />
              <Bar dataKey="winRate" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {comparisonData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Total P&L comparison */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Krahasimi i Strategjive — Total P&L
        </h3>
        <div className="h-[280px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }} layout="vertical">
              <CartesianGrid stroke="#1a342e" horizontal={false} />
              <XAxis
                type="number"
                stroke="#8eb2a8"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#8eb2a8"
                tick={{ fontSize: 9 }}
                width={95}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#091916",
                  border: "1px solid rgba(94,229,255,0.3)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#e5e7eb"
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Total P&L"]}
                labelFormatter={(label: string) => {
                  const item = comparisonData.find(d => d.name === label);
                  return item?.fullName || label;
                }}
              />
              <ReferenceLine x={0} stroke="#8eb2a8" strokeDasharray="3 3" />
              <Bar dataKey="totalPnL" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {comparisonData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.totalPnL >= 0 ? "#36f29b" : "#f59e0b"}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategy summary cards */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Përmbledhje e Strategjive
        </h3>
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {allResults.map((r) => (
            <button
              key={r.strategy}
              onClick={() => setSelectedStrategy(r.strategy)}
              className={`rounded border p-3 text-left transition ${
                selectedStrategy === r.strategy
                  ? "border-terminal-cyan bg-terminal-cyan/[0.08]"
                  : "border-terminal-edge bg-black/20 hover:border-terminal-edge/80"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STRATEGY_COLORS[r.strategy] }}
                />
                <span className={`text-xs font-bold ${selectedStrategy === r.strategy ? "text-terminal-cyan" : "text-white"}`}>
                  {r.strategy}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div>
                  <span className="text-terminal-muted">Win Rate</span>
                  <div className={`font-semibold ${r.winRate >= 60 ? "text-terminal-green" : r.winRate >= 45 ? "text-terminal-cyan" : "text-terminal-amber"}`}>
                    {r.winRate.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-terminal-muted">P&L</span>
                  <div className={`font-semibold ${r.totalPnL >= 0 ? "text-terminal-green" : "text-terminal-amber"}`}>
                    ${r.totalPnL.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-terminal-muted">PF</span>
                  <div className={`font-semibold ${r.profitFactor > 1.5 ? "text-terminal-green" : r.profitFactor > 1.0 ? "text-terminal-cyan" : "text-terminal-amber"}`}>
                    {r.profitFactor.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-terminal-muted">Sharpe</span>
                  <div className={`font-semibold ${r.sharpeRatio > 1.0 ? "text-terminal-green" : r.sharpeRatio > 0 ? "text-terminal-cyan" : "text-terminal-amber"}`}>
                    {r.sharpeRatio.toFixed(2)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Trade log */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Regjistri i Tranzaksioneve — {selectedStrategy}
        </h3>
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-edge text-terminal-muted">
                <th className="py-2 px-1.5 text-left">#</th>
                <th className="py-2 px-1.5 text-left">Hyrja</th>
                <th className="py-2 px-1.5 text-left">Dalja</th>
                <th className="py-2 px-1.5 text-right">Çm. Hyrjes</th>
                <th className="py-2 px-1.5 text-right">Çm. Daljes</th>
                <th className="py-2 px-1.5 text-right">Prem. Hyrjes</th>
                <th className="py-2 px-1.5 text-right">Prem. Daljes</th>
                <th className="py-2 px-1.5 text-right">P&L</th>
                <th className="py-2 px-1.5 text-right">P&L %</th>
              </tr>
            </thead>
            <tbody>
              {displayedTrades.map((trade, i) => (
                <tr
                  key={i}
                  className={`border-b border-terminal-edge/50 ${trade.winner ? "" : "bg-terminal-amber/[0.03]"}`}
                >
                  <td className="py-1.5 px-1.5 text-terminal-muted">{i + 1}</td>
                  <td className="py-1.5 px-1.5 text-terminal-text">{trade.entryDate}</td>
                  <td className="py-1.5 px-1.5 text-terminal-text">{trade.exitDate}</td>
                  <td className="py-1.5 px-1.5 text-right text-terminal-text">${trade.entryPrice}</td>
                  <td className="py-1.5 px-1.5 text-right text-terminal-text">${trade.exitPrice}</td>
                  <td className="py-1.5 px-1.5 text-right text-terminal-cyan">${trade.entryPremium}</td>
                  <td className="py-1.5 px-1.5 text-right text-terminal-cyan">${trade.exitPremium}</td>
                  <td className={`py-1.5 px-1.5 text-right font-semibold ${trade.winner ? "text-terminal-green" : "text-terminal-amber"}`}>
                    {trade.pnl > 0 ? "+" : ""}${trade.pnl.toLocaleString()}
                  </td>
                  <td className={`py-1.5 px-1.5 text-right ${trade.winner ? "text-terminal-green" : "text-terminal-amber"}`}>
                    {trade.pnlPct > 0 ? "+" : ""}{trade.pnlPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.trades.length > 5 && (
          <button
            onClick={() => setShowAllTrades(!showAllTrades)}
            className="mt-2 flex items-center gap-1 text-[10px] text-terminal-cyan hover:text-terminal-cyan/80"
          >
            {showAllTrades ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showAllTrades ? "Shfaq më pak" : `Shfaq të gjitha (${result.trades.length} tranzaksione)`}
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="rounded border border-terminal-amber/30 bg-terminal-amber/[0.05] p-3 text-xs text-terminal-text/70 leading-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={13} className="text-terminal-amber" />
          <span className="font-bold text-terminal-amber">Paralajmërim i Rëndësishëm</span>
        </div>
        <p>
          Backtesting përdor të dhëna historike për të simuluar performancën e strategjisë. Rezultatet e kaltra <b>NUK garantojnë</b> rezultate të ardhshme. Kushtet e tregut ndryshojnë, likuiditeti mund të jetë i ndryshëm, dhe kostot e transaksioneve (slippage, komisione) nuk janë të përfshira. Përdoreni backtesting-in si një mjet edukativ, jo si këshillë financiare. Gjithmonë menaxhoni rrezikun me pozicione të vogla dhe stop-loss.
        </p>
      </div>
    </Panel>
  );
}
