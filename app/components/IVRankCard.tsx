"use client";

import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";

/**
 * IV Rank & IV Percentile Card
 *
 * IV Rank (IVR): where current IV sits within its 52-week range (0-100)
 *   - 100 = IV at year high (options expensive → SELL premium)
 *   - 0   = IV at year low (options cheap → BUY premium)
 *
 * IV Percentile (IVP): % of days in past year where HV was below current IV
 *   - More accurate than IVR for skewed distributions
 *   - 80+ = expensive, 20- = cheap
 *
 * Both metrics tell the same story but IVP is preferred because IVR can over-amplify
 * when there's a single vol spike outlier.
 */
export function IVRankCard({ option }: { option: TerminalOption }) {
  const ivr = option.ivRank ?? 50;
  const ivp = option.ivPercentile ?? 50;

  // Strategy guidance based on IVR + IVP
  const isExpensive = ivr >= 60 && ivp >= 60;
  const isCheap = ivr <= 30 && ivp <= 30;
  const isNeutral = !isExpensive && !isCheap;

  const recommendation = isExpensive
    ? { text: "Shes premium (Sell Calls/Puts)", color: "text-terminal-amber", icon: TrendingUp }
    : isCheap
      ? { text: "Bli premium (Buy Calls/Puts)", color: "text-terminal-green", icon: TrendingDown }
      : { text: "Asnjë avantazh të qartë", color: "text-terminal-cyan", icon: Activity };

  return (
    <div className="mt-2 rounded border border-terminal-edge bg-black/15 p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-terminal-cyan" />
          <span className="text-[10px] uppercase tracking-wider text-terminal-muted font-semibold">IV Rank / Percentile</span>
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
          isExpensive
            ? "bg-terminal-amber/20 text-terminal-amber"
            : isCheap
              ? "bg-terminal-green/20 text-terminal-green"
              : "bg-terminal-cyan/15 text-terminal-cyan"
        }`}>
          {isExpensive ? "EXPENSIVE" : isCheap ? "CHEAP" : "FAIR"}
        </span>
      </div>

      {/* IV Rank & IV Percentile bars */}
      <div className="space-y-2">
        {/* IV Rank */}
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-terminal-muted font-semibold">IV Rank</span>
            <span className={`font-bold ${
              ivr >= 60 ? "text-terminal-amber" : ivr <= 30 ? "text-terminal-green" : "text-terminal-cyan"
            }`}>
              {ivr.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-black/40 overflow-hidden relative">
            {/* Green zone (0-30) */}
            <div className="absolute inset-y-0 left-0 w-[30%] bg-terminal-green/15" />
            {/* Yellow zone (30-60) */}
            <div className="absolute inset-y-0 left-[30%] w-[30%] bg-terminal-cyan/15" />
            {/* Red zone (60-100) */}
            <div className="absolute inset-y-0 left-[60%] w-[40%] bg-terminal-amber/15" />
            {/* Marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
              style={{ left: `${ivr}%` }}
            />
          </div>
          <div className="flex justify-between text-[8px] text-terminal-muted mt-0.5">
            <span>I ulët</span>
            <span>Mesatar</span>
            <span>I lartë</span>
          </div>
        </div>

        {/* IV Percentile */}
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-terminal-muted font-semibold">IV Percentile</span>
            <span className={`font-bold ${
              ivp >= 60 ? "text-terminal-amber" : ivp <= 30 ? "text-terminal-green" : "text-terminal-cyan"
            }`}>
              {ivp.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-black/40 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-[30%] bg-terminal-green/15" />
            <div className="absolute inset-y-0 left-[30%] w-[30%] bg-terminal-cyan/15" />
            <div className="absolute inset-y-0 left-[60%] w-[40%] bg-terminal-amber/15" />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
              style={{ left: `${ivp}%` }}
            />
          </div>
          <div className="flex justify-between text-[8px] text-terminal-muted mt-0.5">
            <span>I ulët</span>
            <span>Mesatar</span>
            <span>I lartë</span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="mt-2 rounded bg-black/30 p-1.5 flex items-center gap-1.5">
        <recommendation.icon size={11} className={`shrink-0 ${recommendation.color}`} />
        <span className={`text-[10px] font-semibold ${recommendation.color}`}>
          {recommendation.text}
        </span>
      </div>

      {/* 52-week HV range */}
      <div className="mt-1.5 text-[9px] text-terminal-text/50 leading-4">
        52w HV: {((option.historical.hvLow52w || 0) * 100).toFixed(1)}% - {((option.historical.hvHigh52w || 0) * 100).toFixed(1)}%
        <span className="text-terminal-text/40"> · IV tani: {(option.iv * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}
