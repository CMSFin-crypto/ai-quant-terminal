"use client";

import { BrainCircuit } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import type { AnalystVerdict } from "@/lib/aiHistoricalAnalyst";
import { Panel } from "./Panel";
import { Metric } from "./Metric";
import { StrategyPlan } from "./StrategyPlan";
import { AnalystList } from "./AnalystList";

interface AIAnalystTabProps {
  selectedOption: TerminalOption;
  selectedAnalysis: AnalystVerdict;
}

export function AIAnalystTab({ selectedOption, selectedAnalysis }: AIAnalystTabProps) {
  return (
    <Panel title="AI Historical Analyst" icon={<BrainCircuit size={17} />}>
      <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3">
        <Metric label="Verdict" value={selectedAnalysis.stance} accent="cyan" />
        <Metric label="Action" value={selectedAnalysis.action} accent="green" />
        <Metric label="Confidence" value={`${selectedAnalysis.confidence}/100`} accent="amber" />
      </div>

      <div className="mt-3 sm:mt-4 rounded border border-terminal-edge bg-black/20 p-3 sm:p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-terminal-muted">
          Historical AI Read
        </div>
        <p className="mt-2 text-xs sm:text-sm leading-5 sm:leading-6 text-terminal-text">{selectedAnalysis.summary}</p>
      </div>

      <div className="mt-3 sm:mt-4 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StrategyPlan analysis={selectedAnalysis} />
        <AnalystList title="Why" items={selectedAnalysis.reasons} tone="green" />
        <AnalystList title="Risks" items={selectedAnalysis.risks} tone="amber" />
      </div>
      <div className="mt-3 sm:mt-4">
        <AnalystList title="Checklist" items={selectedAnalysis.checklist} tone="cyan" />
      </div>
    </Panel>
  );
}
