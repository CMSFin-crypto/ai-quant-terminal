"use client";

import { analyzeHistorically } from "@/lib/aiHistoricalAnalyst";
import { MiniStat } from "./MiniStat";

export function StrategyPlan({
  analysis
}: {
  analysis: ReturnType<typeof analyzeHistorically>;
}) {
  return (
    <div className="rounded border border-terminal-edge bg-black/20 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-terminal-cyan">
        Trade Plan
      </div>
      <div className="mt-3 space-y-3 text-sm leading-5 text-terminal-text">
        <MiniStat label="Bias" value={analysis.bias} />
        <MiniStat label="Structure" value={analysis.structure} />
        <MiniStat label="Risk Level" value={analysis.riskLabel} />
        <div className="rounded border border-terminal-edge bg-black/20 p-2">
          <div className="text-[10px] uppercase tracking-[0.12em] text-terminal-muted">Max Risk</div>
          <div className="mt-1 text-sm text-white">{analysis.maxRiskText}</div>
        </div>
        <div className="rounded border border-terminal-edge bg-black/20 p-2">
          <div className="text-[10px] uppercase tracking-[0.12em] text-terminal-muted">Reward</div>
          <div className="mt-1 text-sm text-white">{analysis.maxRewardText}</div>
        </div>
      </div>
    </div>
  );
}
