"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, ChevronDown, ChevronUp, Info } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import type { AnalystVerdict } from "@/lib/aiHistoricalAnalyst";
import { analyzeHistorically } from "@/lib/aiHistoricalAnalyst";
import { stockMoney, formatSource } from "@/lib/utils";
import { getMetricDef, type MetricDef } from "@/lib/metricDefs";
import { Panel } from "./Panel";
import { MiniStat } from "./MiniStat";
import { SignalBadge } from "./SignalBadge";

const HEADERS = ["Symbol", "Undl", "Right", "Mark", "IV", "Delta", "POP", "Score", "Vol/OI"];

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
  const [activeHeader, setActiveHeader] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selected]);

  // Close header info on click outside
  useEffect(() => {
    if (!activeHeader) return;
    function handleClick() { setActiveHeader(null); }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [activeHeader]);

  const activeDef = activeHeader ? getMetricDef(activeHeader) : null;

  return (
    <Panel
      title={selectedSector === "All" ? "Options Chain" : `${selectedSector} Options`}
      icon={<Activity size={17} />}
      flush
    >
      {/* Desktop: table view */}
      <div className="hidden md:block thin-scrollbar overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-sm">
          <thead className="bg-black/30 text-left text-xs uppercase tracking-[0.16em] text-terminal-muted">
            <tr>
              {HEADERS.map((head) => {
                const def = getMetricDef(head);
                return (
                  <th key={head} className="border-b border-terminal-edge px-3 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveHeader(activeHeader === head ? null : head); }}
                      className={`flex items-center gap-1 transition ${
                        def ? "cursor-pointer hover:text-terminal-cyan" : ""
                      } ${activeHeader === head ? "text-terminal-cyan" : ""}`}
                    >
                      {head}
                      {def && <Info size={10} className="opacity-40" />}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Header info row */}
          {activeDef && (
            <thead>
              <tr>
                <td colSpan={9} className="p-0">
                  <HeaderInfoBar def={activeDef} term={activeHeader!} onClose={() => setActiveHeader(null)} />
                </td>
              </tr>
            </thead>
          )}

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

      {/* Mobile: card list view */}
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
                  <MiniStat label="Undl" value={stockMoney.format(item.underlyingPrice)} />
                  <MiniStat label="Mark" value={`$${item.fairValue.toFixed(2)}`} />
                  <MiniStat label="IV" value={`${(item.iv * 100).toFixed(1)}%`} />
                </div>
              </button>

              {/* Expanded detail on mobile */}
              {isSelected && selectedOption && (
                <div className="mt-1 rounded border border-terminal-cyan/30 bg-terminal-cyan/[0.03] p-3">
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <MiniStat label="Undl" value={stockMoney.format(selectedOption.underlyingPrice)} />
                    <MiniStat label="Strike" value={`$${selectedOption.strike}`} />
                    <MiniStat label="Right" value={`${selectedOption.type.toUpperCase()} · ${selectedOption.moneyness}`} />
                    <MiniStat label="Mark" value={`$${selectedOption.fairValue.toFixed(2)}`} />
                    <MiniStat label="Intrinsic" value={`$${selectedOption.intrinsicValue.toFixed(2)}`} />
                    <MiniStat label="Extrinsic" value={`$${selectedOption.extrinsicValue.toFixed(2)}`} />
                    <MiniStat label="Last" value={`$${selectedOption.price.toFixed(2)}`} />
                    <MiniStat label="POP" value={`${selectedOption.profitProbability.toFixed(1)}%`} />
                    <MiniStat label="DTE" value={`${selectedOption.dte || 30}d`} />
                    <MiniStat label="IV/HV" value={`${(selectedOption.iv * 100).toFixed(1)} / ${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}`} />
                    <MiniStat label="Vol/OI" value={`${selectedOption.volume.toLocaleString()}/${selectedOption.openInterest.toLocaleString()}`} />
                    <MiniStat label="Delta" value={selectedOption.delta.toFixed(2)} />
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

// ─── Header info bar (shown when clicking a column header) ──────────────────

function HeaderInfoBar({ def, term, onClose }: { def: MetricDef; term: string; onClose: () => void }) {
  return (
    <div className="border-b border-terminal-cyan/30 bg-terminal-cyan/[0.06] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-terminal-cyan">{def.term}</span>
            <span className="text-xs text-terminal-muted">{def.full}</span>
          </div>
          <div className="mt-2 space-y-1.5 text-xs leading-4">
            <div>
              <span className="text-terminal-green font-semibold">Çfarë është: </span>
              <span className="text-terminal-text/90">{def.desc}</span>
            </div>
            <div>
              <span className="text-terminal-amber font-semibold">Si përdoret: </span>
              <span className="text-terminal-text/90">{def.use}</span>
            </div>
            <div>
              <span className="text-terminal-cyan font-semibold">Tip: </span>
              <span className="text-terminal-text/90">{def.tip}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="shrink-0 text-terminal-muted hover:text-white text-xs mt-0.5">✕</button>
      </div>
    </div>
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
  const breakEven = item.type === "call"
    ? item.strike + item.price
    : item.strike - item.price;

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
        <td className="px-3 py-3 font-mono text-white">${item.fairValue.toFixed(2)}</td>
        <td className="px-3 py-3 font-mono">{(item.iv * 100).toFixed(1)}%</td>
        <td className="px-3 py-3 font-mono">{item.delta.toFixed(2)}</td>
        <td className="px-3 py-3 font-mono">{item.profitProbability.toFixed(1)}%</td>
        <td className="px-3 py-3 font-semibold text-terminal-green">{item.opportunityScore}</td>
        <td className="px-3 py-3 font-mono text-terminal-muted">
          {item.volume.toLocaleString()}/{item.openInterest.toLocaleString()}
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
                  <div className="text-sm text-terminal-muted">
                    {selectedOption.type.toUpperCase()} · ${selectedOption.strike} · Exp {selectedOption.expirationDate}
                  </div>
                </div>
                <SignalBadge signal={selectedAnalysis?.action || selectedOption.signal.signal} />
              </div>

              {/* Price & Value */}
              <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-4">
                <MiniStat label="Undl" value={stockMoney.format(selectedOption.underlyingPrice)} />
                <MiniStat label="Mark" value={`$${selectedOption.fairValue.toFixed(2)}`} />
                <MiniStat label="Last" value={`$${selectedOption.price.toFixed(2)}`} />
                <MiniStat label={selectedOption.moneyness} value={`${selectedOption.moneyness === "ITM" ? "In" : selectedOption.moneyness === "OTM" ? "Out" : "At"} of Money`} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-4">
                <MiniStat label="Intrinsic" value={`$${selectedOption.intrinsicValue.toFixed(2)}`} />
                <MiniStat label="Extrinsic" value={`$${selectedOption.extrinsicValue.toFixed(2)}`} />
                <MiniStat label="Break Even" value={`$${breakEven.toFixed(2)}`} />
                <MiniStat label="POP" value={`${selectedOption.profitProbability.toFixed(1)}%`} />
              </div>

              {/* Vol & Data */}
              <div className="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-4">
                <MiniStat label="IV" value={`${(selectedOption.iv * 100).toFixed(1)}%`} />
                <MiniStat label="HV 30D" value={`${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}%`} />
                <MiniStat label="IV/HV" value={`${(selectedOption.iv * 100).toFixed(1)} / ${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}`} />
                <MiniStat label="DTE" value={`${selectedOption.dte || 30}d`} />
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
