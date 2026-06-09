"use client";

import { Gauge } from "lucide-react";
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

        {/* AI analysis note */}
        {selectedAnalysis && (
          <div className="mt-3 rounded border border-terminal-cyan/40 bg-terminal-cyan/10 p-2.5 sm:p-3 text-xs leading-5 text-terminal-cyan">
            {selectedAnalysis.structure}. {selectedAnalysis.maxRiskText} {selectedAnalysis.maxRewardText}
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
