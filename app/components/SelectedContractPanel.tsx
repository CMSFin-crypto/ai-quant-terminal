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
  return (
    <Panel title="Selected Contract" icon={<Gauge size={17} />}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-2xl sm:text-3xl font-semibold text-white truncate">{selectedOption.symbol}</div>
            <div className="text-xs sm:text-sm text-terminal-muted truncate">{selectedOption.name}</div>
          </div>
          <SignalBadge signal={selectedAnalysis?.action || selectedOption.signal.signal} />
        </div>

        {/* Key metrics — always visible, 2 cols on mobile, 3 on md+ */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
          <MiniStat label="Strike" value={`$${selectedOption.strike}`} />
          <MiniStat label="Stock Price" value={stockMoney.format(selectedOption.underlyingPrice)} />
          <MiniStat label="Type" value={`${selectedOption.type.toUpperCase()} · ${selectedOption.moneyness}`} />
          <MiniStat label="Fair Value" value={`$${selectedOption.fairValue.toFixed(2)}`} />
          <MiniStat label="Intrinsic" value={`$${selectedOption.intrinsicValue.toFixed(2)}`} />
          <MiniStat label="Time Value" value={`$${selectedOption.extrinsicValue.toFixed(2)}`} />
          <MiniStat label="Last Price" value={`$${selectedOption.price.toFixed(2)}`} />
          <MiniStat label="Edge" value={`${selectedOption.edge >= 0 ? '+' : ''}${selectedOption.edge.toFixed(1)}%`} />
          <MiniStat label="DTE" value={`${selectedOption.dte || 30}d`} />
        </div>

        {/* Secondary metrics — collapsible on very small screens */}
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
          <MiniStat label="Win Prob" value={`${selectedOption.profitProbability.toFixed(1)}%`} />
          <MiniStat label="Opportunity" value={`${selectedOption.opportunityScore}/100`} />
          <MiniStat label="Move Potential" value={`+${selectedOption.upsidePotential.toFixed(1)}%`} />
        </div>

        {/* Data quality row */}
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
          <MiniStat label="Options Data" value={selectedOption.dataSource === "real-options" ? "Live" : "Synthetic"} />
          <MiniStat label="History Data" value={formatSource(selectedOption.historySource)} />
          <MiniStat label="Data Quality" value={`${selectedOption.dataQuality}/100`} />
        </div>

        {/* Greeks */}
        <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2 sm:grid-cols-5">
          <MiniStat label="Delta" value={selectedOption.delta.toFixed(2)} />
          <MiniStat label="Gamma" value={selectedOption.gamma.toFixed(3)} />
          <MiniStat label="Theta" value={selectedOption.theta.toFixed(3)} />
          <MiniStat label="Vega" value={selectedOption.vega.toFixed(4)} />
          <MiniStat label="IV" value={`${(selectedOption.iv * 100).toFixed(1)}%`} />
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
