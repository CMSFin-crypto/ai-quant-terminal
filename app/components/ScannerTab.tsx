"use client";

import { useEffect, useRef } from "react";
import { Activity, AlertTriangle, ChevronDown, ChevronUp, Crosshair, Info, Lightbulb, Shield } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import type { AnalystVerdict } from "@/lib/aiHistoricalAnalyst";
import { analyzeHistorically } from "@/lib/aiHistoricalAnalyst";
import { stockMoney } from "@/lib/utils";
import { getMetricDef } from "@/lib/metricDefs";
import { Panel } from "./Panel";
import { MiniStat } from "./MiniStat";
import { SignalBadge } from "./SignalBadge";
import { HeaderTooltip } from "./InfoTooltip";

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

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selected]);

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
                const hasDef = !!getMetricDef(head);
                return (
                  <th key={head} className="border-b border-terminal-edge px-3 py-3">
                    {hasDef ? (
                      <HeaderTooltip term={head}>
                        <span className="flex items-center gap-1 cursor-help hover:text-terminal-cyan transition">
                          {head}
                          <Info size={10} className="opacity-40" />
                        </span>
                      </HeaderTooltip>
                    ) : (
                      <span>{head}</span>
                    )}
                  </th>
                );
              })}
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

      {/* Mobile: card list view */}
      <div className="md:hidden p-3 space-y-2">
        {filteredRankedData.map((item) => {
          const isSelected = selected === item.symbol;
          const analysis = analyzeHistorically(item);
          const selectedOption = isSelected ? item : undefined;

          return (
            <div key={item.symbol} ref={isSelected ? selectedRef : undefined}>
              <div
                onClick={() => onSelect(item.symbol)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelect(item.symbol); }}
                className={`w-full text-left rounded border p-3 transition cursor-pointer ${
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
                  <MiniStat label="Undl" value={stockMoney.format(item.underlyingPrice)} symbol={item.symbol} />
                  <MiniStat label="Mark" value={`$${item.fairValue.toFixed(2)}`} symbol={item.symbol} />
                  <MiniStat label="IV" value={`${(item.iv * 100).toFixed(1)}%`} symbol={item.symbol} />
                </div>
              </div>

              {/* Expanded detail on mobile */}
              {isSelected && selectedOption && (
                <div className="mt-1 rounded border border-terminal-cyan/30 bg-terminal-cyan/[0.03] p-3">
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <MiniStat label="Undl" value={stockMoney.format(selectedOption.underlyingPrice)} symbol={selectedOption.symbol} />
                    <MiniStat label="Strike" value={`$${selectedOption.strike}`} symbol={selectedOption.symbol} />
                    <MiniStat label="Right" value={`${selectedOption.type.toUpperCase()} · ${selectedOption.moneyness}`} symbol={selectedOption.symbol} />
                    <MiniStat label="Mark" value={`$${selectedOption.fairValue.toFixed(2)}`} symbol={selectedOption.symbol} />
                    <MiniStat label="Intrinsic" value={`$${selectedOption.intrinsicValue.toFixed(2)}`} symbol={selectedOption.symbol} />
                    <MiniStat label="Extrinsic" value={`$${selectedOption.extrinsicValue.toFixed(2)}`} symbol={selectedOption.symbol} />
                    <MiniStat label="Last" value={`$${selectedOption.price.toFixed(2)}`} symbol={selectedOption.symbol} />
                    <MiniStat label="POP" value={`${selectedOption.profitProbability.toFixed(1)}%`} symbol={selectedOption.symbol} />
                    <MiniStat label="DTE" value={`${selectedOption.dte || 30}d`} symbol={selectedOption.symbol} />
                    <MiniStat label="IV/HV" value={`${(selectedOption.iv * 100).toFixed(1)} / ${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}`} symbol={selectedOption.symbol} />
                    <MiniStat label="Vol/OI" value={`${selectedOption.volume.toLocaleString()}/${selectedOption.openInterest.toLocaleString()}`} symbol={selectedOption.symbol} />
                    <MiniStat label="Delta" value={selectedOption.delta.toFixed(2)} symbol={selectedOption.symbol} />
                  </div>

                  {/* ── SQARIMI: Çfarë të bësh, Pse, Si, Rreziku ── */}
                  {selectedAnalysis && (
                    <AlbanianRecommendationCard analysis={selectedAnalysis} symbol={selectedOption.symbol} compact />
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
                <MiniStat label="Undl" value={stockMoney.format(selectedOption.underlyingPrice)} symbol={selectedOption.symbol} />
                <MiniStat label="Mark" value={`$${selectedOption.fairValue.toFixed(2)}`} symbol={selectedOption.symbol} />
                <MiniStat label="Last" value={`$${selectedOption.price.toFixed(2)}`} symbol={selectedOption.symbol} />
                <MiniStat label={selectedOption.moneyness} value={`${selectedOption.moneyness === "ITM" ? "In" : selectedOption.moneyness === "OTM" ? "Out" : "At"} of Money`} symbol={selectedOption.symbol} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-4">
                <MiniStat label="Intrinsic" value={`$${selectedOption.intrinsicValue.toFixed(2)}`} symbol={selectedOption.symbol} />
                <MiniStat label="Extrinsic" value={`$${selectedOption.extrinsicValue.toFixed(2)}`} symbol={selectedOption.symbol} />
                <MiniStat label="Break Even" value={`$${breakEven.toFixed(2)}`} symbol={selectedOption.symbol} />
                <MiniStat label="POP" value={`${selectedOption.profitProbability.toFixed(1)}%`} symbol={selectedOption.symbol} />
              </div>

              {/* Vol & Data */}
              <div className="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-4">
                <MiniStat label="IV" value={`${(selectedOption.iv * 100).toFixed(1)}%`} symbol={selectedOption.symbol} />
                <MiniStat label="HV 30D" value={`${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}%`} symbol={selectedOption.symbol} />
                <MiniStat label="IV/HV" value={`${(selectedOption.iv * 100).toFixed(1)} / ${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}`} symbol={selectedOption.symbol} />
                <MiniStat label="DTE" value={`${selectedOption.dte || 30}d`} symbol={selectedOption.symbol} />
              </div>

              {/* Greeks row */}
              <div className="mt-2 grid grid-cols-5 gap-2">
                <MiniStat label="Delta" value={selectedOption.delta.toFixed(2)} symbol={selectedOption.symbol} />
                <MiniStat label="Gamma" value={selectedOption.gamma.toFixed(3)} symbol={selectedOption.symbol} />
                <MiniStat label="Theta" value={selectedOption.theta.toFixed(3)} symbol={selectedOption.symbol} />
                <MiniStat label="Vega" value={selectedOption.vega.toFixed(4)} symbol={selectedOption.symbol} />
                <MiniStat label="Rho" value={selectedOption.rho.toFixed(4)} symbol={selectedOption.symbol} />
              </div>

              {/* ── SQARIMI: Çfarë të bësh, Pse, Si, Rreziku ── */}
              {selectedAnalysis && (
                <AlbanianRecommendationCard analysis={selectedAnalysis} symbol={selectedOption.symbol} />
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

// ─── Albanian Recommendation Card ──────────────────────────────────────────
// Tregon: Çfarë të bësh, Pse, Si ta bësh, dhe Rrezikun — gjithçka në shqipen standarde letrare

function AlbanianRecommendationCard({
  analysis,
  symbol,
  compact
}: {
  analysis: AnalystVerdict;
  symbol: string;
  compact?: boolean;
}) {
  // Determine colors based on action
  const isBuy = analysis.action.startsWith("BUY");
  const isSell = analysis.action.startsWith("SELL");
  const isAvoid = analysis.action === "AVOID";
  const isWatch = analysis.action === "WATCH";

  const actionColor = isAvoid
    ? "text-red-400"
    : isBuy
      ? "text-terminal-green"
      : isSell
        ? "text-terminal-amber"
        : "text-terminal-cyan";

  const actionBg = isAvoid
    ? "border-red-500/50 bg-red-500/10"
    : isBuy
      ? "border-terminal-green/50 bg-terminal-green/10"
      : isSell
        ? "border-terminal-amber/50 bg-terminal-amber/10"
        : "border-terminal-cyan/50 bg-terminal-cyan/10";

  const actionIcon = isAvoid
    ? <AlertTriangle size={compact ? 14 : 18} className="text-red-400" />
    : isBuy
      ? <Crosshair size={compact ? 14 : 18} className="text-terminal-green" />
      : isSell
        ? <Shield size={compact ? 14 : 18} className="text-terminal-amber" />
        : <Lightbulb size={compact ? 14 : 18} className="text-terminal-cyan" />;

  if (compact) {
    return (
      <div className={`mt-2 rounded border p-2.5 text-xs leading-5 ${actionBg}`}>
        <div className="flex items-center gap-2 mb-1.5">
          {actionIcon}
          <span className={`font-bold ${actionColor}`}>ÇFARË TË BËSH: {analysis.action}</span>
          <span className="text-terminal-muted ml-auto">Besimi: {analysis.confidence}%</span>
        </div>
        <p className="text-terminal-text/90">{analysis.actionAl}</p>
        <p className="mt-1 text-terminal-text/80">{analysis.whyAl}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {/* ── ÇFARË TË BËSH ── */}
      <div className={`rounded border p-3.5 ${actionBg}`}>
        <div className="flex items-center gap-2.5 mb-2">
          {actionIcon}
          <span className={`text-sm font-bold ${actionColor}`}>ÇFARË TË BËSH: {analysis.action}</span>
          <span className="ml-auto text-xs text-terminal-muted bg-black/30 px-2 py-0.5 rounded">
            Besimi: {analysis.confidence}%
          </span>
        </div>
        <p className="text-xs sm:text-sm leading-6 text-terminal-text/95">{analysis.actionAl}</p>
      </div>

      {/* ── PSE ── */}
      <div className="rounded border border-terminal-cyan/30 bg-terminal-cyan/[0.05] p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb size={16} className="text-terminal-cyan" />
          <span className="text-sm font-bold text-terminal-cyan">PSE TA BËSH KËTË?</span>
        </div>
        <p className="text-xs sm:text-sm leading-6 text-terminal-text/90">{analysis.whyAl}</p>
      </div>

      {/* ── SI TA BOSH ── */}
      <div className="rounded border border-terminal-green/30 bg-terminal-green/[0.05] p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <Crosshair size={16} className="text-terminal-green" />
          <span className="text-sm font-bold text-terminal-green">SI TA BËSH (Hapat)</span>
        </div>
        <div className="text-xs sm:text-sm leading-6 text-terminal-text/90">
          {analysis.howAl.split(/\n/).filter(Boolean).map((step, i) => (
            <div key={i} className="flex gap-2 mb-0.5">
              <span className="shrink-0 text-terminal-green/60">›</span>
              <span>{step.trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RREZIKU ── */}
      <div className={`rounded border p-3.5 ${
        analysis.riskLabel === "Very High"
          ? "border-red-500/40 bg-red-500/[0.08]"
          : analysis.riskLabel === "High"
            ? "border-terminal-amber/40 bg-terminal-amber/[0.08]"
            : analysis.riskLabel === "Medium"
              ? "border-yellow-500/30 bg-yellow-500/[0.05]"
              : "border-terminal-green/30 bg-terminal-green/[0.05]"
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} className={
            analysis.riskLabel === "Very High"
              ? "text-red-400"
              : analysis.riskLabel === "High"
                ? "text-terminal-amber"
                : analysis.riskLabel === "Medium"
                  ? "text-yellow-500"
                  : "text-terminal-green"
          } />
          <span className={`text-sm font-bold ${
            analysis.riskLabel === "Very High"
              ? "text-red-400"
              : analysis.riskLabel === "High"
                ? "text-terminal-amber"
                : analysis.riskLabel === "Medium"
                  ? "text-yellow-500"
                  : "text-terminal-green"
          }`}>
            RREZIKU: {analysis.riskLabel === "Low" ? "I Ulët" : analysis.riskLabel === "Medium" ? "Mesatar" : analysis.riskLabel === "High" ? "I Lartë" : "Shumë I Lartë"}
          </span>
        </div>
        <p className="text-xs sm:text-sm leading-6 text-terminal-text/90">{analysis.riskAl}</p>
      </div>
    </div>
  );
}
