"use client";

import { BrainCircuit } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import { analyzeHistorically } from "@/lib/aiHistoricalAnalyst";
import { Panel } from "./Panel";

interface TopSignalsPanelProps {
  topSignals: TerminalOption[];
  onSelect: (symbol: string) => void;
}

export function TopSignalsPanel({ topSignals, onSelect }: TopSignalsPanelProps) {
  return (
    <Panel title="Top AI Signals" icon={<BrainCircuit size={17} />}>
      <div className="space-y-2 sm:space-y-3">
        {topSignals.map((item) => (
          <button
            key={item.symbol}
            onClick={() => onSelect(item.symbol)}
            className="flex w-full items-center justify-between rounded border border-terminal-edge bg-black/20 px-2.5 py-2 sm:px-3 sm:py-2 text-left hover:border-terminal-cyan/50"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">{item.symbol}</div>
              <div className="text-[10px] sm:text-xs text-terminal-muted">{item.signal.confidence}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold text-terminal-green">{item.opportunityScore}</div>
              <div className="text-[10px] sm:text-xs text-terminal-muted">{analyzeHistorically(item).action}</div>
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}
