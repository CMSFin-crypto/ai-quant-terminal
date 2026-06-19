"use client";

import { useState, useMemo } from "react";
import { BarChart3, X } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import { Panel } from "./Panel";
import { SignalBadge } from "./SignalBadge";

interface CompareTabProps {
  data: TerminalOption[];
  selected: string;
  onSelect: (symbol: string) => void;
}

/**
 * Multi-Stock Comparison Tab
 *
 * Lets user pick up to 3 stocks and compare them side-by-side across:
 *   - Price, IV, HV, IVR/IVP, Delta, Gamma, Theta
 *   - POP, R/R, Breakeven
 *   - Signal score, action, opportunity score
 *   - Volume, OI, Vol/OI ratio
 *
 * Color codes best value per metric (green = best, red = worst).
 */
export function CompareTab({ data, selected, onSelect }: CompareTabProps) {
  const [compareList, setCompareList] = useState<string[]>([selected, "AAPL", "MSFT"].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3));

  const compareOptions = useMemo(
    () => compareList.map(sym => data.find(d => d.symbol === sym)).filter(Boolean) as TerminalOption[],
    [compareList, data]
  );

  const allSymbols = data.map(d => d.symbol).sort();
  const availableToAdd = allSymbols.filter(s => !compareList.includes(s));

  const addStock = (sym: string) => {
    if (compareList.length >= 3) return;
    if (compareList.includes(sym)) return;
    setCompareList([...compareList, sym]);
  };
  const removeStock = (sym: string) => {
    setCompareList(compareList.filter(s => s !== sym));
  };

  // Helper to compare metrics — returns 'best' | 'worst' | null for each value
  const compareMetric = (values: (number | null)[], higherIsBetter: boolean, idx: number): "best" | "worst" | null => {
    const valid = values.map((v, i) => ({ v, i })).filter(x => x.v !== null) as { v: number; i: number }[];
    if (valid.length < 2) return null;
    const sorted = [...valid].sort((a, b) => higherIsBetter ? b.v - a.v : a.v - b.v);
    if (sorted[0].i === idx) return "best";
    if (sorted[sorted.length - 1].i === idx) return "worst";
    return null;
  };

  const metricColor = (status: "best" | "worst" | null) =>
    status === "best" ? "text-terminal-green font-bold" :
    status === "worst" ? "text-red-400 font-bold" :
    "text-terminal-text";

  // Build metric rows
  type Row = {
    label: string;
    values: (string | null)[];
    numeric: (number | null)[];
    higherIsBetter: boolean;
  };

  const rows: Row[] = useMemo(() => {
    if (!compareOptions.length) return [];
    return [
      {
        label: "Çmimi",
        values: compareOptions.map(o => o ? `$${o.underlyingPrice.toFixed(2)}` : null),
        numeric: compareOptions.map(o => o ? o.underlyingPrice : null),
        higherIsBetter: false,
      },
      {
        label: "IV %",
        values: compareOptions.map(o => o ? `${(o.iv * 100).toFixed(1)}%` : null),
        numeric: compareOptions.map(o => o ? o.iv * 100 : null),
        higherIsBetter: false, // for buyers, lower IV is better
      },
      {
        label: "HV 30D %",
        values: compareOptions.map(o => o ? `${(o.historical.realizedVol30 * 100).toFixed(1)}%` : null),
        numeric: compareOptions.map(o => o ? o.historical.realizedVol30 * 100 : null),
        higherIsBetter: false,
      },
      {
        label: "IV Rank",
        values: compareOptions.map(o => o ? `${o.ivRank.toFixed(1)}%` : null),
        numeric: compareOptions.map(o => o ? o.ivRank : null),
        higherIsBetter: false,
      },
      {
        label: "IV Percentile",
        values: compareOptions.map(o => o ? `${o.ivPercentile.toFixed(1)}%` : null),
        numeric: compareOptions.map(o => o ? o.ivPercentile : null),
        higherIsBetter: false,
      },
      {
        label: "Delta",
        values: compareOptions.map(o => o ? o.delta.toFixed(2) : null),
        numeric: compareOptions.map(o => o ? o.delta : null),
        higherIsBetter: true,
      },
      {
        label: "Gamma",
        values: compareOptions.map(o => o ? o.gamma.toFixed(3) : null),
        numeric: compareOptions.map(o => o ? o.gamma : null),
        higherIsBetter: true,
      },
      {
        label: "Theta",
        values: compareOptions.map(o => o ? o.theta.toFixed(3) : null),
        numeric: compareOptions.map(o => o ? o.theta : null),
        higherIsBetter: true, // less negative = better
      },
      {
        label: "POP",
        values: compareOptions.map(o => o ? `${o.profitProbability.toFixed(1)}%` : null),
        numeric: compareOptions.map(o => o ? o.profitProbability : null),
        higherIsBetter: true,
      },
      {
        label: "R/R",
        values: compareOptions.map(o => o ? `${(o.signal as any).riskReward?.toFixed(2) ?? "—"}:1` : null),
        numeric: compareOptions.map(o => o ? (o.signal as any).riskReward ?? null : null),
        higherIsBetter: true,
      },
      {
        label: "Breakeven",
        values: compareOptions.map(o => o ? `$${((o.signal as any).breakeven ?? 0).toFixed(2)}` : null),
        numeric: compareOptions.map(o => o ? (o.signal as any).breakeven ?? null : null),
        higherIsBetter: false,
      },
      {
        label: "Volume",
        values: compareOptions.map(o => o ? o.volume.toLocaleString() : null),
        numeric: compareOptions.map(o => o ? o.volume : null),
        higherIsBetter: true,
      },
      {
        label: "Vol/OI",
        values: compareOptions.map(o => o ? (o.volume / Math.max(o.openInterest, 1)).toFixed(2) : null),
        numeric: compareOptions.map(o => o ? o.volume / Math.max(o.openInterest, 1) : null),
        higherIsBetter: true,
      },
      {
        label: "Signal Score",
        values: compareOptions.map(o => o ? `${o.signal.score}/100` : null),
        numeric: compareOptions.map(o => o ? o.signal.score : null),
        higherIsBetter: true,
      },
      {
        label: "Opp. Score",
        values: compareOptions.map(o => o ? `${o.opportunityScore}/100` : null),
        numeric: compareOptions.map(o => o ? o.opportunityScore : null),
        higherIsBetter: true,
      },
    ];
  }, [compareOptions]);

  return (
    <Panel title="Krahasim Multi-Aksion" icon={<BarChart3 size={17} />}>
      <div className="space-y-3">
        {/* Add stock picker */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-terminal-muted font-semibold">
            Shto aksion (max 3):
          </span>
          <select
            value=""
            onChange={(e) => { if (e.target.value) addStock(e.target.value); }}
            disabled={compareList.length >= 3 || availableToAdd.length === 0}
            className="rounded border border-terminal-edge bg-black/30 px-2 py-1 text-xs text-terminal-text disabled:opacity-40"
          >
            <option value="">+ Zgjidh aksion...</option>
            {availableToAdd.map(sym => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </select>
          <span className="text-[10px] text-terminal-muted">
            ({compareList.length}/3)
          </span>
        </div>

        {/* Comparison table */}
        {compareOptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-terminal-edge">
                  <th className="text-left py-2 px-2 text-terminal-muted font-semibold">Metric</th>
                  {compareOptions.map((opt, i) => (
                    <th key={i} className="text-center py-2 px-2">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => onSelect(opt.symbol)}
                          className="text-sm font-bold text-terminal-cyan hover:underline"
                          title="Zgjidh këtë aksion"
                        >
                          {opt.symbol}
                        </button>
                        <div className="flex items-center gap-1">
                          <SignalBadge signal={opt.signal.signal} />
                          <button
                            onClick={() => removeStock(opt.symbol)}
                            className="text-terminal-muted hover:text-red-400"
                            title="Hiq nga krahasimi"
                          >
                            <X size={11} />
                          </button>
                        </div>
                        <div className="text-[9px] text-terminal-muted">
                          {opt.type.toUpperCase()} · ${opt.strike} · {opt.dte}d
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-terminal-edge/30 hover:bg-white/[0.02]">
                    <td className="py-1.5 px-2 text-terminal-muted font-medium">{row.label}</td>
                    {row.values.map((val, cIdx) => {
                      const status = compareMetric(row.numeric, row.higherIsBetter, cIdx);
                      return (
                        <td key={cIdx} className={`text-center py-1.5 px-2 font-mono ${metricColor(status)}`}>
                          {val ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-terminal-muted text-sm">
            Shto aksione për ti krahasuar
          </div>
        )}

        {/* Legend */}
        <div className="rounded border border-terminal-edge bg-black/15 p-2 text-[10px] text-terminal-text/60 leading-4">
          <p>
            <span className="text-terminal-green font-bold">GREEN</span> = më i miri &nbsp;·&nbsp;
            <span className="text-red-400 font-bold">RED</span> = më i keqi &nbsp;·&nbsp;
            <span className="text-terminal-muted">Çmimi i aksionit klikohet për ta zgjedhur në Scanner</span>
          </p>
        </div>
      </div>
    </Panel>
  );
}
