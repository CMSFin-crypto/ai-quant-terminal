"use client";

import { BrainCircuit } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import type { AnalystVerdict } from "@/lib/aiHistoricalAnalyst";
import { macroScore } from "@/lib/macroIntelligence";
import { Panel } from "./Panel";
import { StrategyCard } from "./StrategyCard";

interface StrategyTabProps {
  selectedOption: TerminalOption;
  selectedAnalysis: AnalystVerdict | null;
}

export function StrategyTab({ selectedOption, selectedAnalysis }: StrategyTabProps) {
  return (
    <Panel title="Auto Strategy Builder" icon={<BrainCircuit size={17} />}>
      <div className="grid gap-4 lg:grid-cols-3">
        <StrategyCard title="Primary" name={selectedAnalysis?.action || selectedOption.signal.signal} item={selectedOption} />
        <StrategyCard title="Structure" name={selectedAnalysis?.structure || "Defined-Risk Options Setup"} item={selectedOption} />
        <StrategyCard title="Income" name="Defined-Risk Premium Sale" item={selectedOption} />
      </div>
      <div className="mt-4 rounded border border-terminal-edge bg-black/20 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-terminal-muted">GPT Trade Reasoning</div>
        <p className="mt-2 text-sm leading-6 text-terminal-text">
          {selectedOption.symbol} shows an AI action of {selectedAnalysis?.action || selectedOption.signal.signal} with
          {" "}{(selectedOption.iv * 100).toFixed(1)}% implied volatility, {selectedOption.delta.toFixed(2)} delta, and
          {" "}{selectedOption.edge.toFixed(1)}% model edge versus Black-Scholes fair value. Preferred structure:
          {" "}{selectedAnalysis?.structure || "defined-risk options setup"}. Macro risk is
          {" "}{macroScore(selectedOption).riskScore}/100, so position sizing should respect headline risk, theta decay, and capped premium risk.
        </p>
      </div>
    </Panel>
  );
}
