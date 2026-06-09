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
          <div>
            <div className="text-3xl font-semibold text-white">{selectedOption.symbol}</div>
            <div className="text-sm text-terminal-muted">{selectedOption.name}</div>
          </div>
          <SignalBadge signal={selectedAnalysis?.action || selectedOption.signal.signal} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniStat label="Strike" value={`$${selectedOption.strike}`} />
          <MiniStat label="Stock Price" value={stockMoney.format(selectedOption.underlyingPrice)} />
          <MiniStat label="Type" value={selectedOption.type.toUpperCase()} />
          <MiniStat label="Options Data" value={selectedOption.dataSource === "real-options" ? "Live" : "Synthetic"} />
          <MiniStat label="History Data" value={formatSource(selectedOption.historySource)} />
          <MiniStat label="Data Quality" value={`${selectedOption.dataQuality}/100`} />
          <MiniStat label="AI Action" value={selectedAnalysis?.action || selectedOption.signal.signal} />
          <MiniStat label="Risk" value={selectedAnalysis?.riskLabel || "Medium"} />
          <MiniStat
            label="Fair Value"
            value={`$${selectedOption.fairValue.toFixed(2)}`}
          />
          <MiniStat
            label="Last Price"
            value={`$${selectedOption.price.toFixed(2)}`}
          />
          <MiniStat
            label="DTE"
            value={`${selectedOption.dte || 30}d`}
          />
          <MiniStat label="Win Prob" value={`${selectedOption.profitProbability.toFixed(1)}%`} />
          <MiniStat label="Opportunity" value={`${selectedOption.opportunityScore}/100`} />
          <MiniStat label="Move Potential" value={`+${selectedOption.upsidePotential.toFixed(1)}%`} />
          <MiniStat label="MC Avg" value={`$${selectedOption.mc.avg.toFixed(2)}`} />
          <MiniStat label="30D HV" value={`${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}%`} />
          <MiniStat label="Max DD" value={`${(selectedOption.historical.maxDrawdown * 100).toFixed(1)}%`} />
        </div>
        {selectedAnalysis && (
          <div className="mt-3 rounded border border-terminal-cyan/40 bg-terminal-cyan/10 p-3 text-xs leading-5 text-terminal-cyan">
            {selectedAnalysis.structure}. {selectedAnalysis.maxRiskText} {selectedAnalysis.maxRewardText}
          </div>
        )}
        {selectedOption.warnings.length > 0 && (
          <div className="mt-3 rounded border border-terminal-amber/40 bg-terminal-amber/10 p-3 text-xs leading-5 text-terminal-amber">
            {selectedOption.warnings.join(" ")}
          </div>
        )}
      </div>
    </Panel>
  );
}
