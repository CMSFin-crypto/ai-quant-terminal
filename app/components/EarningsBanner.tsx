"use client";

import { AlertTriangle, CalendarClock } from "lucide-react";

interface EarningsInfo {
  symbol: string;
  earningsDate: string | null;
  daysToEarnings: number | null;
  source: string;
}

/**
 * Earnings Banner — shows prominent warning when earnings is approaching.
 *
 * Critical windows:
 *   ≤ 7 days:  RED — IV is already elevated, options are expensive, gamma risk extreme
 *   ≤ 14 days: AMBER — IV crush risk high after earnings
 *   ≤ 30 days: CYAN — start planning around the event
 *
 * Click for tooltip explaining IV crush mechanics.
 */
export function EarningsBanner({ earningsInfo }: { earningsInfo: EarningsInfo }) {
  const days = earningsInfo.daysToEarnings ?? 0;
  const severity =
    days <= 7 ? "critical" :
    days <= 14 ? "high" :
    "moderate";

  const colors = {
    critical: "border-red-500/50 bg-red-500/15 text-red-300",
    high: "border-terminal-amber/50 bg-terminal-amber/15 text-terminal-amber",
    moderate: "border-terminal-cyan/40 bg-terminal-cyan/10 text-terminal-cyan",
  }[severity];

  const messages = {
    critical: `EARNINGS ${days === 0 ? "SOT" : days === 1 ? "NESËR" : `PAS ${days} DITËSH`} — IV është rritur, opsionet janë shumë të shtrenjta. Gamma risk ekstrem.`,
    high: `EARNINGS PAS ${days} DITËSH — IV crush risk i lartë. Konsidero spread ose mbyll pozicionet para eventit.`,
    moderate: `EARNINGS PAS ${days} DITËSH — planifiko tani. IV do të rritet ndjeshëm javën e ardhshme.`,
  }[severity];

  return (
    <div className={`flex items-center gap-2.5 rounded border px-3 py-2 text-xs sm:text-sm ${colors}`}>
      {severity === "critical" ? (
        <AlertTriangle size={16} className="shrink-0" />
      ) : (
        <CalendarClock size={16} className="shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider">
            {earningsInfo.symbol} · {earningsInfo.earningsDate}
          </span>
        </div>
        <p className="text-[11px] sm:text-xs leading-4 opacity-90 mt-0.5">{messages}</p>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[10px] uppercase opacity-70">Days</div>
        <div className="text-lg font-bold">{days}</div>
      </div>
    </div>
  );
}
