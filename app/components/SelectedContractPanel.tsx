"use client";

import { AlertTriangle, Crosshair, Gauge, Lightbulb, Shield } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import type { AnalystVerdict } from "@/lib/aiHistoricalAnalyst";
import { stockMoney, formatSource } from "@/lib/utils";
import { Panel } from "./Panel";
import { MiniStat } from "./MiniStat";
import { SignalBadge } from "./SignalBadge";

interface SelectedContractPanelProps {
  selectedOption: TerminalOption;
  selectedAnalysis: AnalystVerdict | null;
}

export function SelectedContractPanel({ selectedOption, selectedAnalysis }: SelectedContractPanelProps) {
  // IBKR-style break-even: Strike + Premium for calls, Strike - Premium for puts
  const breakEven = selectedOption.type === "call"
    ? selectedOption.strike + selectedOption.price
    : selectedOption.strike - selectedOption.price;

  // OTM%: how far out-of-the-money as percentage
  const otmPct = selectedOption.type === "call"
    ? Math.max((selectedOption.strike - selectedOption.underlyingPrice) / selectedOption.underlyingPrice * 100, 0)
    : Math.max((selectedOption.underlyingPrice - selectedOption.strike) / selectedOption.underlyingPrice * 100, 0);

  return (
    <Panel title="Contract Details" icon={<Gauge size={17} />}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-2xl sm:text-3xl font-semibold text-white truncate">{selectedOption.symbol}</div>
            <div className="text-xs sm:text-sm text-terminal-muted truncate">
              {selectedOption.type.toUpperCase()} · ${selectedOption.strike} · {selectedOption.expirationDate}
            </div>
          </div>
          <SignalBadge signal={selectedAnalysis?.action || selectedOption.signal.signal} />
        </div>

        {/* Price & Value — IBKR style */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
          <MiniStat label="Undl" value={stockMoney.format(selectedOption.underlyingPrice)} />
          <MiniStat label="Mark" value={`$${selectedOption.fairValue.toFixed(2)}`} />
          <MiniStat label="Last" value={`$${selectedOption.price.toFixed(2)}`} />
          <MiniStat label="Intrinsic" value={`$${selectedOption.intrinsicValue.toFixed(2)}`} />
          <MiniStat label="Extrinsic" value={`$${selectedOption.extrinsicValue.toFixed(2)}`} />
          <MiniStat label={selectedOption.moneyness} value={`${otmPct.toFixed(1)}% ${selectedOption.moneyness === "ITM" ? "ITM" : selectedOption.moneyness === "OTM" ? "OTM" : "ATM"}`} />
        </div>

        {/* Key metrics — IBKR terminology */}
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
          <MiniStat label="Break Even" value={`$${breakEven.toFixed(2)}`} />
          <MiniStat label="POP" value={`${selectedOption.profitProbability.toFixed(1)}%`} />
          <MiniStat label="DTE" value={`${selectedOption.dte || 30}d`} />
          <MiniStat label="IV" value={`${(selectedOption.iv * 100).toFixed(1)}%`} />
          <MiniStat label="HV 30D" value={`${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}%`} />
          <MiniStat label="IV/HV" value={`${(selectedOption.iv * 100).toFixed(1)} / ${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}`} />
        </div>

        {/* Greeks — IBKR style */}
        <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2 sm:grid-cols-5">
          <MiniStat label="Delta" value={selectedOption.delta.toFixed(2)} />
          <MiniStat label="Gamma" value={selectedOption.gamma.toFixed(3)} />
          <MiniStat label="Theta" value={selectedOption.theta.toFixed(3)} />
          <MiniStat label="Vega" value={selectedOption.vega.toFixed(4)} />
          <MiniStat label="Rho" value={selectedOption.rho.toFixed(4)} />
        </div>

        {/* Volume & OI */}
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
          <MiniStat label="Vol" value={selectedOption.volume.toLocaleString()} />
          <MiniStat label="OI" value={selectedOption.openInterest.toLocaleString()} />
          <MiniStat label="Vol/OI" value={`${(selectedOption.volume / Math.max(selectedOption.openInterest, 1)).toFixed(2)}`} />
        </div>

        {/* Data source */}
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
          <MiniStat label="Feed" value={selectedOption.dataSource === "real-options" ? "Live" : "Synthetic"} />
          <MiniStat label="Hist" value={formatSource(selectedOption.historySource)} />
          <MiniStat label="Quality" value={`${selectedOption.dataQuality}/100`} />
        </div>

        {/* ── SQARIMI: Çka me bo, Pse, Si, Rreziku ── */}
        {selectedAnalysis && (
          <div className="mt-3 space-y-2">
            {/* ÇKA ME BO */}
            <SidebarRecommendation analysis={selectedAnalysis} />
          </div>
        )}

        {selectedOption.warnings.length > 0 && (
          <div className="mt-2 rounded border border-terminal-amber/40 bg-terminal-amber/10 p-2.5 sm:p-3 text-xs leading-5 text-terminal-amber">
            {selectedOption.warnings.join(" ")}
          </div>
        )}
      </div>
    </Panel>
  );
}

// ─── Sidebar recommendation card (compact version for the sidebar) ──────

function SidebarRecommendation({ analysis }: { analysis: AnalystVerdict }) {
  const isBuy = analysis.action.startsWith("BUY");
  const isSell = analysis.action.startsWith("SELL");
  const isAvoid = analysis.action === "AVOID";

  const actionColor = isAvoid
    ? "text-red-400"
    : isBuy
      ? "text-terminal-green"
      : isSell
        ? "text-terminal-amber"
        : "text-terminal-cyan";

  const actionBg = isAvoid
    ? "border-red-500/50 bg-red-500/10"
    : isBuy
      ? "border-terminal-green/50 bg-terminal-green/10"
      : isSell
        ? "border-terminal-amber/50 bg-terminal-amber/10"
        : "border-terminal-cyan/50 bg-terminal-cyan/10";

  const actionIcon = isAvoid
    ? <AlertTriangle size={15} className="text-red-400" />
    : isBuy
      ? <Crosshair size={15} className="text-terminal-green" />
      : isSell
        ? <Shield size={15} className="text-terminal-amber" />
        : <Lightbulb size={15} className="text-terminal-cyan" />;

  return (
    <>
      {/* ÇKA ME BO */}
      <div className={`rounded border p-2.5 ${actionBg}`}>
        <div className="flex items-center gap-2 mb-1.5">
          {actionIcon}
          <span className={`text-xs font-bold ${actionColor}`}>ÇKA ME BO: {analysis.action}</span>
          <span className="ml-auto text-[10px] text-terminal-muted bg-black/30 px-1.5 py-0.5 rounded">
            {analysis.confidence}%
          </span>
        </div>
        <p className="text-xs leading-5 text-terminal-text/90">{analysis.actionAl}</p>
      </div>

      {/* PSE */}
      <div className="rounded border border-terminal-cyan/30 bg-terminal-cyan/[0.05] p-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Lightbulb size={14} className="text-terminal-cyan" />
          <span className="text-xs font-bold text-terminal-cyan">PSE?</span>
        </div>
        <p className="text-xs leading-5 text-terminal-text/85">{analysis.whyAl}</p>
      </div>

      {/* SI TA BOSH */}
      <div className="rounded border border-terminal-green/30 bg-terminal-green/[0.05] p-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Crosshair size={14} className="text-terminal-green" />
          <span className="text-xs font-bold text-terminal-green">SI TA BOSH?</span>
        </div>
        <div className="text-xs leading-5 text-terminal-text/85">
          {analysis.howAl.split(/(?=\d\.\s)/).filter(Boolean).map((step, i) => (
            <div key={i} className="flex gap-1.5 mb-0.5">
              <span className="shrink-0 text-terminal-green/60">›</span>
              <span>{step.trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RREZIKU */}
      <div className={`rounded border p-2.5 ${
        analysis.riskLabel === "Very High"
          ? "border-red-500/40 bg-red-500/[0.08]"
          : analysis.riskLabel === "High"
            ? "border-terminal-amber/40 bg-terminal-amber/[0.08]"
            : analysis.riskLabel === "Medium"
              ? "border-yellow-500/30 bg-yellow-500/[0.05]"
              : "border-terminal-green/30 bg-terminal-green/[0.05]"
      }`}>
        <div className="flex items-center gap-2 mb-1.5">
          <Shield size={14} className={
            analysis.riskLabel === "Very High"
              ? "text-red-400"
              : analysis.riskLabel === "High"
                ? "text-terminal-amber"
                : analysis.riskLabel === "Medium"
                  ? "text-yellow-500"
                  : "text-terminal-green"
          } />
          <span className={`text-xs font-bold ${
            analysis.riskLabel === "Very High"
              ? "text-red-400"
              : analysis.riskLabel === "High"
                ? "text-terminal-amber"
                : analysis.riskLabel === "Medium"
                  ? "text-yellow-500"
                  : "text-terminal-green"
          }`}>
            RREZIKU: {analysis.riskLabel === "Low" ? "I Ulët" : analysis.riskLabel === "Medium" ? "Mesatar" : analysis.riskLabel === "High" ? "I Lartë" : "Shumë I Lartë"}
          </span>
        </div>
        <p className="text-xs leading-5 text-terminal-text/85">{analysis.riskAl}</p>
      </div>
    </>
  );
}
