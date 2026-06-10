"use client";

import { BrainCircuit, Crosshair, Lightbulb, Shield, AlertTriangle } from "lucide-react";
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

      {/* ── Sqarimi në shqip: Çka me bo, Pse, Si, Rreziku ── */}
      <div className="mt-4 space-y-2">
        {/* ÇKA ME BO */}
        <div className={`rounded border p-3.5 ${
          selectedAnalysis.action === "AVOID" ? "border-red-500/50 bg-red-500/10" :
          selectedAnalysis.action.startsWith("BUY") ? "border-terminal-green/50 bg-terminal-green/10" :
          selectedAnalysis.action.startsWith("SELL") ? "border-terminal-amber/50 bg-terminal-amber/10" :
          "border-terminal-cyan/50 bg-terminal-cyan/10"
        }`}>
          <div className="flex items-center gap-2.5 mb-2">
            {selectedAnalysis.action === "AVOID" ? <AlertTriangle size={18} className="text-red-400" /> :
             selectedAnalysis.action.startsWith("BUY") ? <Crosshair size={18} className="text-terminal-green" /> :
             selectedAnalysis.action.startsWith("SELL") ? <Shield size={18} className="text-terminal-amber" /> :
             <Lightbulb size={18} className="text-terminal-cyan" />}
            <span className={`text-sm font-bold ${
              selectedAnalysis.action === "AVOID" ? "text-red-400" :
              selectedAnalysis.action.startsWith("BUY") ? "text-terminal-green" :
              selectedAnalysis.action.startsWith("SELL") ? "text-terminal-amber" :
              "text-terminal-cyan"
            }`}>ÇKA ME BO: {selectedAnalysis.action}</span>
            <span className="ml-auto text-xs text-terminal-muted bg-black/30 px-2 py-0.5 rounded">Besimi: {selectedAnalysis.confidence}%</span>
          </div>
          <p className="text-xs sm:text-sm leading-6 text-terminal-text/95">{selectedAnalysis.actionAl}</p>
        </div>

        {/* PSE */}
        <div className="rounded border border-terminal-cyan/30 bg-terminal-cyan/[0.05] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={16} className="text-terminal-cyan" />
            <span className="text-sm font-bold text-terminal-cyan">PSE ME E BO KËTË?</span>
          </div>
          <p className="text-xs sm:text-sm leading-6 text-terminal-text/90">{selectedAnalysis.whyAl}</p>
        </div>

        {/* SI TA BOSH */}
        <div className="rounded border border-terminal-green/30 bg-terminal-green/[0.05] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Crosshair size={16} className="text-terminal-green" />
            <span className="text-sm font-bold text-terminal-green">SI TA BOSH (Hapat)</span>
          </div>
          <div className="text-xs sm:text-sm leading-6 text-terminal-text/90">
            {selectedAnalysis.howAl.split(/(?=\d\.\s)/).filter(Boolean).map((step, i) => (
              <div key={i} className="flex gap-2 mb-0.5">
                <span className="shrink-0 text-terminal-green/60">›</span>
                <span>{step.trim()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RREZIKU */}
        <div className={`rounded border p-3.5 ${
          selectedAnalysis.riskLabel === "Very High" ? "border-red-500/40 bg-red-500/[0.08]" :
          selectedAnalysis.riskLabel === "High" ? "border-terminal-amber/40 bg-terminal-amber/[0.08]" :
          selectedAnalysis.riskLabel === "Medium" ? "border-yellow-500/30 bg-yellow-500/[0.05]" :
          "border-terminal-green/30 bg-terminal-green/[0.05]"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className={
              selectedAnalysis.riskLabel === "Very High" ? "text-red-400" :
              selectedAnalysis.riskLabel === "High" ? "text-terminal-amber" :
              selectedAnalysis.riskLabel === "Medium" ? "text-yellow-500" :
              "text-terminal-green"
            } />
            <span className={`text-sm font-bold ${
              selectedAnalysis.riskLabel === "Very High" ? "text-red-400" :
              selectedAnalysis.riskLabel === "High" ? "text-terminal-amber" :
              selectedAnalysis.riskLabel === "Medium" ? "text-yellow-500" :
              "text-terminal-green"
            }`}>RREZIKU: {selectedAnalysis.riskLabel === "Low" ? "I Ulët" : selectedAnalysis.riskLabel === "Medium" ? "Mesatar" : selectedAnalysis.riskLabel === "High" ? "I Lartë" : "Shumë I Lartë"}</span>
          </div>
          <p className="text-xs sm:text-sm leading-6 text-terminal-text/90">{selectedAnalysis.riskAl}</p>
        </div>
      </div>
    </Panel>
  );
}
