"use client";

import { AlertTriangle, ArrowUpDown, Crosshair, Gauge, Lightbulb, Scale, Shield, TrendingDown, TrendingUp } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import type { AnalystVerdict } from "@/lib/aiHistoricalAnalyst";
import { stockMoney, formatSource } from "@/lib/utils";
import { generateVolSkew } from "@/lib/volAnalytics";
import { Panel } from "./Panel";
import { MiniStat } from "./MiniStat";
import { SignalBadge } from "./SignalBadge";

interface SelectedContractPanelProps {
  selectedOption: TerminalOption;
  selectedAnalysis: AnalystVerdict | null;
}

export function SelectedContractPanel({ selectedOption, selectedAnalysis }: SelectedContractPanelProps) {
  const sym = selectedOption.symbol;
  // IBKR-style break-even: Strike + Premium for calls, Strike - Premium for puts
  const breakEven = selectedOption.type === "call"
    ? selectedOption.strike + selectedOption.price
    : selectedOption.strike - selectedOption.price;

  // Moneyness distance: how far ITM or OTM as percentage
  const moneynessPct = selectedOption.type === "call"
    ? ((selectedOption.underlyingPrice - selectedOption.strike) / selectedOption.strike * 100)
    : ((selectedOption.strike - selectedOption.underlyingPrice) / selectedOption.strike * 100);
  const moneynessLabel = Math.abs(moneynessPct) < 0.01
    ? "0.0% ATM"
    : moneynessPct > 0
      ? `${moneynessPct.toFixed(1)}% ITM`
      : `${Math.abs(moneynessPct).toFixed(1)}% OTM`;

  return (
    <Panel title="Contract Details" icon={<Gauge size={17} />}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-2xl sm:text-3xl font-semibold text-white truncate">{selectedOption.symbol}</div>
            <div className="text-xs sm:text-sm text-terminal-muted truncate">
              {selectedOption.type.toUpperCase()} · ${selectedOption.strike} · {selectedOption.expirationDate}
            </div>
          </div>
          <SignalBadge signal={selectedAnalysis?.action || selectedOption.signal.signal} />
        </div>

        {/* Price & Value — IBKR style */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
          <MiniStat label="Undl" value={stockMoney.format(selectedOption.underlyingPrice)} symbol={sym} />
          <MiniStat label="Mark" value={`$${selectedOption.fairValue.toFixed(2)}`} symbol={sym} />
          <MiniStat label="Last" value={`$${selectedOption.price.toFixed(2)}`} symbol={sym} />
          <MiniStat label="Intrinsic" value={`$${selectedOption.intrinsicValue.toFixed(2)}`} symbol={sym} />
          <MiniStat label="Extrinsic" value={`$${selectedOption.extrinsicValue.toFixed(2)}`} symbol={sym} />
          <MiniStat label={selectedOption.moneyness} value={moneynessLabel} symbol={sym} />
        </div>

        {/* Key metrics — IBKR terminology */}
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
          <MiniStat label="Break Even" value={`$${breakEven.toFixed(2)}`} symbol={sym} />
          <MiniStat label="POP" value={`${selectedOption.profitProbability.toFixed(1)}%`} symbol={sym} />
          <MiniStat label="DTE" value={`${selectedOption.dte || 30}d`} symbol={sym} />
          <MiniStat label="IV" value={`${(selectedOption.iv * 100).toFixed(1)}%`} symbol={sym} />
          <MiniStat label="HV 30D" value={`${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}%`} symbol={sym} />
          <MiniStat label="IV/HV" value={`${(selectedOption.iv * 100).toFixed(1)} / ${(selectedOption.historical.realizedVol30 * 100).toFixed(1)}`} symbol={sym} />
        </div>

        {/* ── IV/HV STATUS BADGE — inline "Opsionet janë të shtrenjta/të lira" ── */}
        <IVHStatusBadge option={selectedOption} />

        {/* ── AI RISK INSIGHTS — POP, R/R, breakeven, daily decay ── */}
        <AIRiskInsightsCard option={selectedOption} />

        {/* ── VOL SKEW MINI-CARD — OTM put vs OTM call IV ── */}
        <VolSkewMiniCard option={selectedOption} />

        {/* ── TRADE SETUP CARD — Max Profit/Loss para hyrjes ── */}
        <TradeSetupCard option={selectedOption} breakEven={breakEven} />

        {/* Greeks — IBKR style */}
        <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2 sm:grid-cols-5">
          <MiniStat label="Delta" value={selectedOption.delta.toFixed(2)} symbol={sym} />
          <MiniStat label="Gamma" value={selectedOption.gamma.toFixed(3)} symbol={sym} />
          <MiniStat label="Theta" value={selectedOption.theta.toFixed(3)} symbol={sym} />
          <MiniStat label="Vega" value={selectedOption.vega.toFixed(4)} symbol={sym} />
          <MiniStat label="Rho" value={selectedOption.rho.toFixed(4)} symbol={sym} />
        </div>

        {/* Volume & OI */}
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
          <MiniStat label="Vol" value={selectedOption.volume.toLocaleString()} symbol={sym} />
          <MiniStat label="OI" value={selectedOption.openInterest.toLocaleString()} symbol={sym} />
          <MiniStat label="Vol/OI" value={`${(selectedOption.volume / Math.max(selectedOption.openInterest, 1)).toFixed(2)}`} symbol={sym} />
        </div>

        {/* Data source */}
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
          <MiniStat label="Feed" value={selectedOption.dataSource === "real-options" ? "Live" : "Synthetic"} symbol={sym} />
          <MiniStat label="Hist" value={formatSource(selectedOption.historySource)} symbol={sym} />
          <MiniStat label="Quality" value={`${selectedOption.dataQuality}/100`} symbol={sym} />
        </div>

        {/* ── SQARIMI: Çfarë të bësh, Pse, Si, Rreziku ── */}
        {selectedAnalysis && (
          <div className="mt-3 space-y-2">
            {/* ÇFARË TË BËSH */}
            <SidebarRecommendation analysis={selectedAnalysis} />
          </div>
        )}

        {selectedOption.warnings.length > 0 && (
          <div className="mt-2 rounded border border-terminal-amber/40 bg-terminal-amber/10 p-2.5 sm:p-3 text-xs leading-5 text-terminal-amber">
            {selectedOption.warnings.join(" ")}
          </div>
        )}

        {/* ── AI SIGNAL WARNINGS — gamma risk, IV crush, theta alarm ── */}
        {selectedOption.signal.warnings && selectedOption.signal.warnings.length > 0 && (
          <div className="mt-2 rounded border border-red-500/40 bg-red-500/[0.08] p-2.5 sm:p-3 text-xs leading-5 text-red-300">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={12} className="shrink-0" />
              <span className="font-bold uppercase tracking-wider text-[10px]">Sinjalizime Rreziku</span>
            </div>
            <ul className="space-y-1">
              {selectedOption.signal.warnings.map((w, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="shrink-0 text-red-400/60">›</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}

// ─── IV/HV Status Badge — inline interpretation ──────────────────────────

function IVHStatusBadge({ option }: { option: TerminalOption }) {
  const ivPct = option.iv * 100;
  const hvPct = option.historical.realizedVol30 * 100;
  const spread = ivPct - hvPct;
  const isExpensive = spread > 5;
  const isCheap = spread < -3;

  return (
    <div className={`mt-2 rounded border p-2 flex items-center gap-2 ${
      isExpensive
        ? "border-terminal-amber/40 bg-terminal-amber/[0.08]"
        : isCheap
          ? "border-terminal-green/40 bg-terminal-green/[0.08]"
          : "border-terminal-cyan/25 bg-terminal-cyan/[0.04]"
    }`}>
      {isExpensive ? (
        <TrendingUp size={14} className="text-terminal-amber shrink-0" />
      ) : isCheap ? (
        <TrendingDown size={14} className="text-terminal-green shrink-0" />
      ) : (
        <ArrowUpDown size={14} className="text-terminal-cyan shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-terminal-muted">IV/HV:</span>
          <span className={`text-[10px] sm:text-xs font-bold ${
            isExpensive ? "text-terminal-amber" : isCheap ? "text-terminal-green" : "text-terminal-cyan"
          }`}>
            {ivPct.toFixed(1)}% / {hvPct.toFixed(1)}%
          </span>
          <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold ${
            isExpensive
              ? "bg-terminal-amber/20 text-terminal-amber"
              : isCheap
                ? "bg-terminal-green/20 text-terminal-green"
                : "bg-terminal-cyan/15 text-terminal-cyan"
          }`}>
            {isExpensive ? "SHTRENJTA" : isCheap ? "TË LIRA" : "NORMALE"}
          </span>
        </div>
        <p className="text-[9px] sm:text-[10px] leading-4 text-terminal-text/60 mt-0.5">
          {isExpensive
            ? `IV është +${spread.toFixed(1)}% mbi HV — opsionet janë të shtrenjta, konsideroni shitjen`
            : isCheap
              ? `IV është ${spread.toFixed(1)}% nën HV — opsionet janë të lira, mund të blini`
              : `IV dhe HV janë afër — vlerësim i arsyeshëm, asnjë avantazh i qartë`}
        </p>
      </div>
    </div>
  );
}

// ─── AI Risk Insights — POP, R/R, breakeven, daily decay (from signalEngine v2) ─

function AIRiskInsightsCard({ option }: { option: TerminalOption }) {
  const sig = option.signal;
  // signalEngine v2 returns these; safe-guard for older data
  const pop = (sig as any).pop ?? option.profitProbability;
  const breakeven = (sig as any).breakeven ?? 0;
  const dailyDecayPct = (sig as any).dailyDecayPct ?? 0;
  const riskReward = (sig as any).riskReward ?? 0;
  const maxProfit = (sig as any).maxProfit ?? 0;
  const maxLoss = (sig as any).maxLoss ?? 0;

  // Decay severity buckets
  const decaySeverity =
    dailyDecayPct > 3 ? "critical" :
    dailyDecayPct > 1.5 ? "high" :
    dailyDecayPct > 0.7 ? "moderate" : "low";

  const decayColor =
    decaySeverity === "critical" ? "text-red-400 bg-red-500/15" :
    decaySeverity === "high" ? "text-terminal-amber bg-terminal-amber/15" :
    decaySeverity === "moderate" ? "text-terminal-cyan bg-terminal-cyan/10" :
    "text-terminal-green bg-terminal-green/10";

  return (
    <div className="mt-2 rounded border border-terminal-edge bg-black/15 p-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Gauge size={12} className="text-terminal-cyan" />
          <span className="text-[10px] uppercase tracking-wider text-terminal-muted font-semibold">AI Risk Insights</span>
        </div>
        <span className="text-[9px] text-terminal-muted bg-black/30 px-1.5 py-0.5 rounded">
          {sig.signal}
        </span>
      </div>

      {/* Top row: POP + R/R + Decay */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* POP */}
        <div className="rounded bg-black/20 p-1.5 text-center">
          <div className="text-[9px] text-terminal-muted uppercase">POP</div>
          <div className={`text-sm font-bold ${pop >= 50 ? "text-terminal-green" : "text-terminal-amber"}`}>
            {pop.toFixed(1)}%
          </div>
          <div className="text-[8px] text-terminal-text/40">Probability of Profit</div>
        </div>

        {/* R/R */}
        <div className="rounded bg-black/20 p-1.5 text-center">
          <div className="text-[9px] text-terminal-muted uppercase">R/R</div>
          <div className={`text-sm font-bold ${
            riskReward >= 2 ? "text-terminal-green" : riskReward >= 1 ? "text-terminal-amber" : "text-red-400"
          }`}>
            {riskReward.toFixed(1)}:1
          </div>
          <div className="text-[8px] text-terminal-text/40">Fitim / Humbje</div>
        </div>

        {/* Daily decay */}
        <div className="rounded bg-black/20 p-1.5 text-center">
          <div className="text-[9px] text-terminal-muted uppercase">Decay</div>
          <div className={`text-sm font-bold ${decayColor.split(" ")[0]}`}>
            {dailyDecayPct.toFixed(2)}%
          </div>
          <div className="text-[8px] text-terminal-text/40">Per ditë</div>
        </div>
      </div>

      {/* Decay severity badge */}
      <div className="mt-1.5 flex items-center justify-between">
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${decayColor}`}>
          {decaySeverity === "critical" ? "KRITIK" :
           decaySeverity === "high" ? "I LARTË" :
           decaySeverity === "moderate" ? "MESATAR" : "I ULËT"}
        </span>
        {breakeven > 0 && (
          <span className="text-[10px] text-terminal-muted">
            Breakeven: <span className="text-terminal-cyan font-semibold">${breakeven.toFixed(2)}</span>
          </span>
        )}
      </div>

      {/* Max P/L bar */}
      {maxLoss > 0 && maxProfit > 0 && (
        <div className="mt-1.5">
          <div className="flex justify-between text-[9px] text-terminal-muted mb-0.5">
            <span className="text-terminal-green">+${maxProfit.toLocaleString()}</span>
            <span className="text-red-400">-${maxLoss.toLocaleString()}</span>
          </div>
          <div className="h-1.5 rounded-full bg-red-500/20 overflow-hidden flex">
            <div className="h-full bg-terminal-green/70" style={{ width: `${Math.min(80, riskReward / (riskReward + 1) * 100)}%` }} />
            <div className="h-full bg-red-500/50" style={{ width: `${Math.max(20, 100 - riskReward / (riskReward + 1) * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vol Skew Mini-Card — OTM put vs OTM call IV ─────────────────────────

function VolSkewMiniCard({ option }: { option: TerminalOption }) {
  const skewData = generateVolSkew(option);
  const spot = option.underlyingPrice;
  const strikeStep = spot >= 500 ? 10 : spot >= 200 ? 5 : spot >= 50 ? 2.5 : 1;
  const atmStrike = Math.round(spot / strikeStep) * strikeStep;

  // Find OTM put (2 strikes below ATM) and OTM call (2 strikes above ATM)
  const otmPutStrike = atmStrike - 2 * strikeStep;
  const otmCallStrike = atmStrike + 2 * strikeStep;
  const otmPut = skewData.find(p => p.strike === otmPutStrike);
  const otmCall = skewData.find(p => p.strike === otmCallStrike);
  const atmPoint = skewData.find(p => p.strike === atmStrike);

  if (!otmPut || !otmCall || !atmPoint) return null;

  const putSkew = otmPut.iv - atmPoint.iv;
  const callSkew = otmCall.iv - atmPoint.iv;
  const isSmirk = putSkew > 3 && callSkew < 1.5;
  const isSmile = putSkew > 2 && callSkew > 2;

  return (
    <div className="mt-2 rounded border border-terminal-edge bg-black/15 p-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-terminal-muted font-semibold">Vol Skew</span>
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
          isSmirk
            ? "bg-terminal-amber/20 text-terminal-amber"
            : isSmile
              ? "bg-terminal-cyan/15 text-terminal-cyan"
              : "bg-terminal-green/15 text-terminal-green"
        }`}>
          {isSmirk ? "PUT SKEW" : isSmile ? "SMILE" : "FLAT"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <div className="text-[9px] text-terminal-muted">OTM Put</div>
          <div className="text-xs font-semibold text-terminal-amber">{otmPut.iv.toFixed(1)}%</div>
          <div className="text-[8px] text-terminal-muted">${otmPut.strike}</div>
        </div>
        <div>
          <div className="text-[9px] text-terminal-muted">ATM</div>
          <div className="text-xs font-semibold text-terminal-cyan">{atmPoint.iv.toFixed(1)}%</div>
          <div className="text-[8px] text-terminal-muted">${atmPoint.strike}</div>
        </div>
        <div>
          <div className="text-[9px] text-terminal-muted">OTM Call</div>
          <div className="text-xs font-semibold text-terminal-green">{otmCall.iv.toFixed(1)}%</div>
          <div className="text-[8px] text-terminal-muted">${otmCall.strike}</div>
        </div>
      </div>

      {/* Skew bars */}
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] text-terminal-amber w-8">Put</span>
          <div className="flex-1 h-1.5 rounded-full bg-black/30 overflow-hidden">
            <div className="h-full rounded-full bg-terminal-amber/60" style={{ width: `${Math.min(100, (otmPut.iv / 80) * 100)}%` }} />
          </div>
          <span className="text-[8px] text-terminal-muted">+{putSkew.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] text-terminal-green w-8">Call</span>
          <div className="flex-1 h-1.5 rounded-full bg-black/30 overflow-hidden">
            <div className="h-full rounded-full bg-terminal-green/60" style={{ width: `${Math.min(100, (otmCall.iv / 80) * 100)}%` }} />
          </div>
          <span className="text-[8px] text-terminal-muted">+{callSkew.toFixed(1)}%</span>
        </div>
      </div>

      <p className="text-[9px] leading-4 text-terminal-text/50 mt-1.5">
        {isSmirk
          ? "OTM puts kanë IV më të lartë — tregu frikësohet nga rënia"
          : isSmile
            ? "Të dyja krahët kanë IV të lartë — priten lëvizje të mëdha"
            : "IV është e balancuar — tregu është i qetë"}
      </p>
    </div>
  );
}

// ─── Trade Setup Card — Max Profit/Loss para hyrjes ─────────────────────

function TradeSetupCard({ option, breakEven }: { option: TerminalOption; breakEven: number }) {
  const spot = option.underlyingPrice;
  const premium = option.price;
  const strike = option.strike;
  const type = option.type;
  const mc = option.mc;

  // Calculate max profit/loss for the primary strategy
  let maxProfit = 0;
  let maxLoss = 0;
  let strategyName = "";
  let profitLabel = "";
  let lossLabel = "";
  let isUnlimitedProfit = false;

  if (type === "call") {
    // Long Call
    maxLoss = Math.round(premium * 100);
    maxProfit = Math.round((mc.percentiles.p99 - strike - premium) * 100);
    isUnlimitedProfit = true;
    strategyName = "Long Call";
    profitLabel = `Nëse aksioni → $${mc.percentiles.p99.toFixed(0)}`;
    lossLabel = `Premiumi i paguar`;
  } else {
    // Long Put
    maxLoss = Math.round(premium * 100);
    maxProfit = Math.round((strike - premium - mc.percentiles.p1) * 100);
    strategyName = "Long Put";
    profitLabel = `Nëse aksioni → $${mc.percentiles.p1.toFixed(0)}`;
    lossLabel = `Premiumi i paguar`;
  }

  const riskReward = maxLoss > 0 ? (maxProfit / maxLoss) : 0;
  const popPct = option.profitProbability;

  return (
    <div className="mt-2 rounded border border-terminal-edge bg-black/15 p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Scale size={12} className="text-terminal-cyan" />
          <span className="text-[10px] uppercase tracking-wider text-terminal-muted font-semibold">Trade Setup</span>
        </div>
        <span className="text-[9px] text-terminal-cyan bg-terminal-cyan/10 px-1.5 py-0.5 rounded font-medium">
          {strategyName}
        </span>
      </div>

      {/* Profit / Loss display */}
      <div className="grid grid-cols-2 gap-2">
        {/* Max Profit */}
        <div className="rounded border border-terminal-green/30 bg-terminal-green/[0.06] p-2 text-center">
          <div className="text-[9px] text-terminal-muted uppercase tracking-wider">Fitim Maks</div>
          <div className="text-sm font-bold text-terminal-green mt-0.5">
            {isUnlimitedProfit && "+"}${maxProfit.toLocaleString()}
          </div>
          <div className="text-[8px] text-terminal-text/40 mt-0.5">{profitLabel}</div>
        </div>
        {/* Max Loss */}
        <div className="rounded border border-red-500/30 bg-red-500/[0.06] p-2 text-center">
          <div className="text-[9px] text-terminal-muted uppercase tracking-wider">Humbje Maks</div>
          <div className="text-sm font-bold text-red-400 mt-0.5">
            -${maxLoss.toLocaleString()}
          </div>
          <div className="text-[8px] text-terminal-text/40 mt-0.5">{lossLabel}</div>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="mt-2 grid grid-cols-3 gap-1 text-center">
        <div>
          <div className="text-[9px] text-terminal-muted">Break Even</div>
          <div className="text-xs font-semibold text-terminal-cyan">${breakEven.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[9px] text-terminal-muted">POP</div>
          <div className="text-xs font-semibold text-terminal-green">{popPct.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-[9px] text-terminal-muted">R/R</div>
          <div className={`text-xs font-semibold ${riskReward >= 2 ? "text-terminal-green" : riskReward >= 1 ? "text-terminal-amber" : "text-red-400"}`}>
            {riskReward.toFixed(1)}:1
          </div>
        </div>
      </div>

      {/* R/R bar */}
      <div className="mt-2">
        <div className="flex items-center gap-1">
          <div className="flex-1 h-2 rounded-full bg-red-500/20 overflow-hidden flex">
            <div className="h-full bg-terminal-green/70 rounded-l-full" style={{ width: `${Math.min(80, riskReward / (riskReward + 1) * 100)}%` }} />
            <div className="h-full bg-red-500/50 rounded-r-full" style={{ width: `${Math.max(20, 100 - riskReward / (riskReward + 1) * 100)}%` }} />
          </div>
        </div>
        <div className="flex justify-between text-[8px] text-terminal-muted mt-0.5">
          <span className="text-terminal-green">Fitim</span>
          <span className="text-red-400">Humbje</span>
        </div>
      </div>

      <p className="text-[9px] leading-4 text-terminal-text/50 mt-1.5">
        Para se të hyni: mund të fitoni derë ${maxProfit.toLocaleString()} ose të humbni ${maxLoss.toLocaleString()}. Break even në $${breakEven.toFixed(2)}. Shiko tab-in &ldquo;P&L&rdquo; për diagramën e plotë.
      </p>
    </div>
  );
}

// ─── Sidebar recommendation card (compact version for the sidebar) ──────

function SidebarRecommendation({ analysis }: { analysis: AnalystVerdict }) {
  const isBuy = analysis.action.startsWith("BUY");
  const isSell = analysis.action.startsWith("SELL");
  const isAvoid = analysis.action === "AVOID";

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
    ? <AlertTriangle size={15} className="text-red-400" />
    : isBuy
      ? <Crosshair size={15} className="text-terminal-green" />
      : isSell
        ? <Shield size={15} className="text-terminal-amber" />
        : <Lightbulb size={15} className="text-terminal-cyan" />;

  return (
    <>
      {/* ÇFARË TË BËSH */}
      <div className={`rounded border p-2.5 ${actionBg}`}>
        <div className="flex items-center gap-2 mb-1.5">
          {actionIcon}
          <span className={`text-xs font-bold ${actionColor}`}>ÇFARË TË BËSH: {analysis.action}</span>
          <span className="ml-auto text-[10px] text-terminal-muted bg-black/30 px-1.5 py-0.5 rounded">
            {analysis.confidence}%
          </span>
        </div>
        <p className="text-xs leading-5 text-terminal-text/90">{analysis.actionAl}</p>
      </div>

      {/* PSE */}
      <div className="rounded border border-terminal-cyan/30 bg-terminal-cyan/[0.05] p-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Lightbulb size={14} className="text-terminal-cyan" />
          <span className="text-xs font-bold text-terminal-cyan">PSE?</span>
        </div>
        <p className="text-xs leading-5 text-terminal-text/85">{analysis.whyAl}</p>
      </div>

      {/* SI TA BËSH */}
      <div className="rounded border border-terminal-green/30 bg-terminal-green/[0.05] p-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Crosshair size={14} className="text-terminal-green" />
          <span className="text-xs font-bold text-terminal-green">SI TA BËSH?</span>
        </div>
        <div className="text-xs leading-5 text-terminal-text/85">
          {analysis.howAl.split(/\n/).filter(Boolean).map((step, i) => (
            <div key={i} className="flex gap-1.5 mb-0.5">
              <span className="shrink-0 text-terminal-green/60">›</span>
              <span>{step.trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RREZIKU */}
      <div className={`rounded border p-2.5 ${
        analysis.riskLabel === "Very High"
          ? "border-red-500/40 bg-red-500/[0.08]"
          : analysis.riskLabel === "High"
            ? "border-terminal-amber/40 bg-terminal-amber/[0.08]"
            : analysis.riskLabel === "Medium"
              ? "border-yellow-500/30 bg-yellow-500/[0.05]"
              : "border-terminal-green/30 bg-terminal-green/[0.05]"
      }`}>
        <div className="flex items-center gap-2 mb-1.5">
          <Shield size={14} className={
            analysis.riskLabel === "Very High"
              ? "text-red-400"
              : analysis.riskLabel === "High"
                ? "text-terminal-amber"
                : analysis.riskLabel === "Medium"
                  ? "text-yellow-500"
                  : "text-terminal-green"
          } />
          <span className={`text-xs font-bold ${
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
        <p className="text-xs leading-5 text-terminal-text/85">{analysis.riskAl}</p>
      </div>
    </>
  );
}
