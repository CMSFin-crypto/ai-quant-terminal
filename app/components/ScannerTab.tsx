"use client";

import { useEffect, useRef } from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import type { AnalystVerdict } from "@/lib/aiHistoricalAnalyst";
import { analyzeHistorically } from "@/lib/aiHistoricalAnalyst";
import { money, stockMoney, formatSource } from "@/lib/utils";
import { Panel } from "./Panel";
import { MiniStat } from "./MiniStat";
import { SignalBadge } from "./SignalBadge";

interface ScannerTabProps {
  filteredRankedData: TerminalOption[];
  selected: string;
  onSelect: (symbol: string) => void;
  selectedSector: string;
  selectedAnalysis: AnalystVerdict | null;
}

export function ScannerTab({
  filteredRankedData,
  selected,
  onSelect,
  selectedSector,
  selectedAnalysis
}: ScannerTabProps) {
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selected]);

  return (
    <Panel
      title={selectedSector === "All" ? "Multi-Sector Options Scanner" : `${selectedSector} Scanner`}
      icon={<Activity size={17} />}
      flush
    >
      {/* Desktop: table view (hidden on mobile) */}
      <div className="hidden md:block thin-scrollbar overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-sm">
          <thead className="bg-black/30 text-left text-xs uppercase tracking-[0.16em] text-terminal-muted">
            <tr>
              {["Ticker", "Price", "AI Action", "Opp", "Quality", "Potential", "Win %", "IV/HV", "Edge"].map(
                (head) => (
                  <th key={head} className="border-b border-terminal-edge px-3 py-3">
                    {head}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filteredRankedData.map((item) => {
              const isSelected = selected === item.symbol;
              const analysis = analyzeHistorically(item);

              return (
                <ScannerRowDesktop
                  key={item.symbol}
                  item={item}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  analysis={analysis}
                  selectedOption={isSelected ? filteredRankedData.find(i => i.symbol === selected) : undefined}
                  selectedAnalysis={isSelected ? selectedAnalysis : undefined}
                  rowRef={isSelected ? selectedRef as any : undefined}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: card list view (hidden on desktop) */}
      <div className="md:hidden p-3 space-y-2">
        {filteredRankedData.map((item) => {
          const isSelected = selected === item.symbol;
          const analysis = analyzeHistorically(item);
          const selectedOption = isSelected ? item : undefined;

          return (
            <div key={item.symbol} ref={isSelected ? selectedRef : undefined}>
              <button
                onClick={() => onSelect(item.symbol)}
                className={`w-full text-left rounded border p-3 transition ${
                  isSelected
                    ? "border-terminal-cyan/50 bg-terminal-cyan/5"
                    : "border-terminal-edge bg-black/20 hover:border-terminal-green/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-white">{item.symbol}</div>
                    <div className="text-xs text-terminal-muted truncate">{item.name}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SignalBadge signal={analysis.action} />
                    {isSelected ? <ChevronUp size={14} className="text-terminal-cyan" /> : <ChevronDown size={14} className="text-terminal-muted/40" />}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <MiniStat label="Price" value={stockMoney.format(item.underlyingPrice)} />
                  <MiniStat label="Opp" value={`${item.opportunityScore}`} />
                  <MiniStat label="Edge" value={`${item.edge >= 0 ? '+' : ''}${item.edge.toFixed(1)}%`} />
                </div>
              </button>

              {/* Expanded detail on mobile */}
              {isSelected && selectedOption && (
                <div className="mt-1 rounded border border-terminal-cyan/30 bg-terminal-cyan/[0.03] p-3">
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <MiniStat label="Strike" value={`$${selectedOption.strike}`} />
                    <MiniStat label="Stock Price" value={stockMoney.format(selectedOption.underlyingPrice)} />
                    <MiniStat label="Type" value={`${selectedOption.type.toUpperCase()} · ${selectedOption.moneyness}`} />
                    <MiniStat label="Fair Value" value={`$${selectedOption.fairValue.toFixed(2)}`} />
                    <MiniStat label="Intrinsic" value={`$${selectedOption.intrinsicValue.toFixed(2)}`} />
                    <MiniStat label="Time Value" value={`$${selectedOption.extrinsicValue.toFixed(2)}`} />
                    <MiniStat label="Last Price" value={`$${selectedOption.price.toFixed(2)}`} />
                    <MiniStat label="Edge" value={`${selectedOption.edge >= 0 ? '+' : ''}${selectedOption.edge.toFixed(1)}%`} />
                    <MiniStat label="Win Prob" value={`${selectedOption.profitProbability.toFixed(1)}%`} />
                    <MiniStat label="DTE" value={`${selectedOption.dte || 30}d`} />
                    <MiniStat label="IV/HV" value={`${(selectedOption.iv * 100).toFixed(1)}% / ${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}%`} />
                    <MiniStat label="Quality" value={`${selectedOption.dataQuality}/100`} />
                  </div>

                  {/* Greeks */}
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    <MiniStat label="Delta" value={selectedOption.delta.toFixed(2)} />
                    <MiniStat label="Gamma" value={selectedOption.gamma.toFixed(3)} />
                    <MiniStat label="Theta" value={selectedOption.theta.toFixed(3)} />
                  </div>

                  {/* AI note */}
                  {selectedAnalysis && (
                    <div className="mt-2 rounded border border-terminal-cyan/40 bg-terminal-cyan/10 p-2 text-xs leading-5 text-terminal-cyan">
                      {selectedAnalysis.structure}. {selectedAnalysis.maxRiskText} {selectedAnalysis.maxRewardText}
                    </div>
                  )}
                  {selectedOption.warnings.length > 0 && (
                    <div className="mt-1.5 rounded border border-terminal-amber/40 bg-terminal-amber/10 p-2 text-xs leading-5 text-terminal-amber">
                      {selectedOption.warnings.join(" ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─── Desktop row with inline expansion ────────────────────────────────────

function ScannerRowDesktop({
  item,
  isSelected,
  onSelect,
  analysis,
  selectedOption,
  selectedAnalysis,
  rowRef
}: {
  item: TerminalOption;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
  analysis: AnalystVerdict;
  selectedOption?: TerminalOption;
  selectedAnalysis?: AnalystVerdict | null;
  rowRef?: React.Ref<HTMLTableRowElement | null>;
}) {
  return (
    <>
      <tr
        ref={rowRef}
        onClick={() => onSelect(item.symbol)}
        className={`cursor-pointer border-b border-terminal-edge/70 hover:bg-terminal-green/5 ${
          isSelected ? "bg-terminal-cyan/5" : ""
        }`}
      >
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            {isSelected ? (
              <ChevronUp size={14} className="shrink-0 text-terminal-cyan" />
            ) : (
              <ChevronDown size={14} className="shrink-0 text-terminal-muted/40" />
            )}
            <div>
              <div className="font-semibold text-white">{item.symbol}</div>
              <div className="text-xs text-terminal-muted">{item.sector}</div>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 font-semibold text-white">
          {stockMoney.format(item.underlyingPrice)}
        </td>
        <td className="px-3 py-3">
          <SignalBadge signal={analysis.action} />
        </td>
        <td className="px-3 py-3 font-semibold text-terminal-green">{item.opportunityScore}</td>
        <td className={item.dataQuality >= 75 ? "px-3 py-3 text-terminal-green" : item.dataQuality >= 50 ? "px-3 py-3 text-terminal-amber" : "px-3 py-3 text-terminal-red"}>
          {item.dataQuality}
        </td>
        <td className="px-3 py-3 text-terminal-cyan">+{item.upsidePotential.toFixed(1)}%</td>
        <td className="px-3 py-3">{item.profitProbability.toFixed(1)}%</td>
        <td className="px-3 py-3">
          {(item.iv * 100).toFixed(1)}% / {(item.historical.realizedVol30 * 100).toFixed(1)}%
        </td>
        <td className={item.edge >= 0 ? "px-3 py-3 text-terminal-green" : "px-3 py-3 text-terminal-red"}>
          {item.edge.toFixed(1)}%
        </td>
      </tr>

      {/* ── Inline detail expansion ── */}
      {isSelected && selectedOption && (
        <tr className="border-b border-terminal-cyan/30 bg-terminal-cyan/[0.03]">
          <td colSpan={9} className="p-0">
            <div className="px-4 py-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl font-semibold text-white">{selectedOption.symbol}</div>
                  <div className="text-sm text-terminal-muted">{selectedOption.name}</div>
                </div>
                <SignalBadge signal={selectedAnalysis?.action || selectedOption.signal.signal} />
              </div>

              {/* Stats grid */}
              <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-4">
                <MiniStat label="Strike" value={`$${selectedOption.strike}`} />
                <MiniStat label="Stock Price" value={stockMoney.format(selectedOption.underlyingPrice)} />
                <MiniStat label="Type" value={`${selectedOption.type.toUpperCase()} · ${selectedOption.moneyness}`} />
                <MiniStat label="Fair Value" value={`$${selectedOption.fairValue.toFixed(2)}`} />
                <MiniStat label="Intrinsic" value={`$${selectedOption.intrinsicValue.toFixed(2)}`} />
                <MiniStat label="Time Value" value={`$${selectedOption.extrinsicValue.toFixed(2)}`} />
                <MiniStat label="Last Price" value={`$${selectedOption.price.toFixed(2)}`} />
                <MiniStat label="Edge" value={`${selectedOption.edge >= 0 ? '+' : ''}${selectedOption.edge.toFixed(1)}%`} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-4">
                <MiniStat label="Options Data" value={selectedOption.dataSource === "real-options" ? "Live" : "Synthetic"} />
                <MiniStat label="History Data" value={formatSource(selectedOption.historySource)} />
                <MiniStat label="Data Quality" value={`${selectedOption.dataQuality}/100`} />
                <MiniStat label="AI Action" value={selectedAnalysis?.action || selectedOption.signal.signal} />
                <MiniStat label="Risk" value={selectedAnalysis?.riskLabel || "Medium"} />
                <MiniStat label="Win Prob" value={`${selectedOption.profitProbability.toFixed(1)}%`} />
                <MiniStat label="Opportunity" value={`${selectedOption.opportunityScore}/100`} />
                <MiniStat label="Move Potential" value={`+${selectedOption.upsidePotential.toFixed(1)}%`} />
              </div>

              {/* Greeks row */}
              <div className="mt-2 grid grid-cols-5 gap-2">
                <MiniStat label="Delta" value={selectedOption.delta.toFixed(2)} />
                <MiniStat label="Gamma" value={selectedOption.gamma.toFixed(3)} />
                <MiniStat label="Theta" value={selectedOption.theta.toFixed(3)} />
                <MiniStat label="Vega" value={selectedOption.vega.toFixed(4)} />
                <MiniStat label="Rho" value={selectedOption.rho.toFixed(4)} />
              </div>

              {/* AI analysis note */}
              {selectedAnalysis && (
                <div className="mt-3 rounded border border-terminal-cyan/40 bg-terminal-cyan/10 p-3 text-xs leading-5 text-terminal-cyan">
                  {selectedAnalysis.structure}. {selectedAnalysis.maxRiskText} {selectedAnalysis.maxRewardText}
                </div>
              )}

              {/* Warnings */}
              {selectedOption.warnings.length > 0 && (
                <div className="mt-2 rounded border border-terminal-amber/40 bg-terminal-amber/10 p-3 text-xs leading-5 text-terminal-amber">
                  {selectedOption.warnings.join(" ")}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
