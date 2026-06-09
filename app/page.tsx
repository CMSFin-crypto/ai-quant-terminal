"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Gauge,
  Globe2,
  LineChart as LineChartIcon,
  Radar,
  RefreshCw,
  ShieldCheck,
  Zap
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { STOCKS } from "@/lib/sectors";
import { calculateHistoricalMetrics, generateMockHistory } from "@/lib/historicalAnalytics";
import { analyzeHistorically } from "@/lib/aiHistoricalAnalyst";
import {
  buildMockTerminalData,
  buildSyntheticOption,
  buildRiskCurve,
  buildVolSurface,
  normalizePolygonOption,
  pickOptionContract,
  type TerminalOption
} from "@/lib/workstation";
import { buildHistoricalStress, macroEvents, macroScore } from "@/lib/macroIntelligence";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const stockMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const tabs = ["Scanner", "AI Analyst", "Macro", "Vol Surface", "Flow", "Strategy", "Risk"] as const;

type Tab = (typeof tabs)[number];

export default function Page() {
  const [data, setData] = useState<TerminalOption[]>([]);
  const [status, setStatus] = useState("Booting");
  const [activeTab, setActiveTab] = useState<Tab>("Scanner");
  const [selected, setSelected] = useState("NVDA");
  const [selectedSector, setSelectedSector] = useState<TerminalOption["sector"] | "All">("All");
  const [lastRefresh, setLastRefresh] = useState("--:--:--");

  const selectedOption = useMemo(
    () => data.find((item) => item.symbol === selected) || data[0],
    [data, selected]
  );

  const sectors = useMemo(
    () =>
      [...new Set(data.map((item) => item.sector))].map((sector) => {
        const rows = data.filter((item) => item.sector === sector);
        return {
          sector,
          score: Math.round(rows.reduce((sum, item) => sum + item.signal.score, 0) / rows.length),
          premium: rows.reduce((sum, item) => sum + item.premium, 0),
          iv: rows.reduce((sum, item) => sum + item.iv, 0) / rows.length
        };
      }),
    [data]
  );

  const rankedData = useMemo(
    () =>
      [...data].sort(
        (a, b) =>
          b.opportunityScore - a.opportunityScore ||
          b.upsidePotential - a.upsidePotential ||
          b.profitProbability - a.profitProbability
      ),
    [data]
  );

  const filteredRankedData = useMemo(
    () =>
      selectedSector === "All"
        ? rankedData
        : rankedData.filter((item) => item.sector === selectedSector),
    [rankedData, selectedSector]
  );

  const topSignals = useMemo(
    () => filteredRankedData.slice(0, 8),
    [filteredRankedData]
  );

  const whaleFlow = useMemo(
    () => [...data].sort((a, b) => b.premium - a.premium).slice(0, 10),
    [data]
  );

  const fetchAll = async () => {
    setStatus("Syncing");
    const fallback = buildMockTerminalData(STOCKS);

    try {
      const responses = await Promise.all(
        STOCKS.map(async (stock) => {
          const [optionsRes, historyRes, quoteRes] = await Promise.all([
            fetch(`/api/options?symbol=${stock.symbol}`),
            fetch(`/api/history?symbol=${stock.symbol}&days=365`),
            fetch(`/api/quote?symbol=${stock.symbol}`)
          ]);
          const [optionsJson, historyJson, quoteJson] = await Promise.all([
            optionsRes.json(),
            historyRes.json(),
            quoteRes.json()
          ]);
          const historySource = historyJson?.source || "unknown";
          const hasRealHistory = Array.isArray(historyJson?.results) && historyJson.results.length >= 90;
          const bars = hasRealHistory ? historyJson.results : generateMockHistory(stock.symbol);
          const historical = calculateHistoricalMetrics(bars);
          const quotePrice = Number(quoteJson?.price || 0) || undefined;
          const contract = pickOptionContract(optionsJson?.results, historical, quotePrice);
          const finalHistorySource = hasRealHistory ? historySource : "simulated";

          return contract
            ? normalizePolygonOption(stock, contract, historical, quotePrice, finalHistorySource)
            : buildSyntheticOption(stock, historical, quotePrice, finalHistorySource);
        })
      );

      setData(responses);
      setStatus("LIVE");
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {
      setData(fallback);
      setStatus("SIM MODE");
      setLastRefresh(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (data.length && !data.some((item) => item.symbol === selected)) {
      setSelected(data[0].symbol);
    }
  }, [data, selected]);

  const volSurface = buildVolSurface(selectedOption?.symbol || "NVDA");
  const riskCurve = selectedOption ? buildRiskCurve(selectedOption) : buildRiskCurve("NVDA");
  const selectedMacro = selectedOption ? macroScore(selectedOption) : null;
  const selectedAnalysis = selectedOption ? analyzeHistorically(selectedOption) : null;
  const historicalStress = selectedOption ? buildHistoricalStress(selectedOption) : [];
  const portfolioRisk = data.reduce((sum, item) => sum + Math.abs(item.delta) * item.premium, 0);
  const grossPremium = data.reduce((sum, item) => sum + item.premium, 0);
  const highConviction = data.filter((item) => item.signal.score >= 78).length;

  return (
    <main className="terminal-grid min-h-screen bg-terminal-bg text-terminal-text">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 py-4 lg:px-6">
        <header className="flex flex-col gap-4 border-b border-terminal-edge pb-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.24em] text-terminal-green">
              <Radar size={18} />
              Ultra Hedge Fund Workstation V2
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white md:text-5xl">
              Real Quant AI Terminal
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Metric label="Status" value={status} accent={status === "LIVE" ? "green" : "amber"} />
            <Metric label="Refresh" value={lastRefresh} />
            <Metric label="Premium" value={money.format(grossPremium)} />
            <Metric label="Signals" value={`${highConviction}/${data.length || 25}`} accent="cyan" />
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_1fr_360px]">
          <aside className="flex flex-col gap-4">
            <Panel title="Command" icon={<Bot size={17} />}>
              <button
                onClick={fetchAll}
                className="flex h-11 w-full items-center justify-center gap-2 rounded border border-terminal-green/40 bg-terminal-green/10 text-sm font-semibold text-terminal-green transition hover:bg-terminal-green/20"
              >
                <RefreshCw size={16} />
                Refresh Scanner
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`h-10 rounded border text-xs font-semibold ${
                      activeTab === tab
                        ? "border-terminal-cyan bg-terminal-cyan/10 text-terminal-cyan"
                        : "border-terminal-edge bg-black/20 text-terminal-muted hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Sectors" icon={<BarChart3 size={17} />}>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedSector("All");
                    setActiveTab("Scanner");
                    setSelected(rankedData[0]?.symbol || selected);
                  }}
                  className={`w-full rounded border p-3 text-left ${
                    selectedSector === "All"
                      ? "border-terminal-cyan bg-terminal-cyan/10"
                      : "border-terminal-edge bg-black/20 hover:border-terminal-green/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-white">All Sectors</span>
                    <span className="text-terminal-cyan">{data.length}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded bg-terminal-edge">
                    <div className="h-full bg-terminal-cyan" style={{ width: "100%" }} />
                  </div>
                </button>
                {sectors.map((sector) => (
                  <button
                    key={sector.sector}
                    onClick={() => {
                      const firstInSector = rankedData.find((item) => item.sector === sector.sector);
                      setSelectedSector(sector.sector);
                      setActiveTab("Scanner");
                      setSelected(firstInSector?.symbol || selected);
                    }}
                    className={`w-full rounded border p-3 text-left ${
                      selectedSector === sector.sector
                        ? "border-terminal-cyan bg-terminal-cyan/10"
                        : "border-terminal-edge bg-black/20 hover:border-terminal-green/50"
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-white">{sector.sector}</span>
                      <span className="text-terminal-green">{sector.score}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded bg-terminal-edge">
                      <div
                        className="h-full bg-terminal-green"
                        style={{ width: `${Math.min(100, sector.score)}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </Panel>
          </aside>

          <section className="min-w-0">
            {activeTab === "Scanner" && (
              <Panel
                title={selectedSector === "All" ? "Multi-Sector Options Scanner" : `${selectedSector} Scanner`}
                icon={<Activity size={17} />}
                flush
              >
                <div className="thin-scrollbar overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-sm">
                    <thead className="bg-black/30 text-left text-xs uppercase tracking-[0.16em] text-terminal-muted">
                      <tr>
                        {["Ticker", "Price", "Sector", "AI Action", "Opp", "Quality", "Potential", "Win %", "IV/HV", "Trend", "Edge", "Premium"].map(
                          (head) => (
                            <th key={head} className="border-b border-terminal-edge px-3 py-3">
                              {head}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRankedData.map((item) => (
                        <tr
                          key={item.symbol}
                          onClick={() => setSelected(item.symbol)}
                          className={`cursor-pointer border-b border-terminal-edge/70 hover:bg-terminal-green/5 ${
                            selected === item.symbol ? "bg-terminal-cyan/5" : ""
                          }`}
                        >
                          <td className="px-3 py-3">
                            <div className="font-semibold text-white">{item.symbol}</div>
                            <div className="text-xs text-terminal-muted">{item.name}</div>
                          </td>
                          <td className="px-3 py-3 font-semibold text-white">
                            {stockMoney.format(item.underlyingPrice)}
                          </td>
                          <td className="px-3 py-3 text-terminal-muted">{item.sector}</td>
                          <td className="px-3 py-3">
                            <SignalBadge signal={analyzeHistorically(item).action} />
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
                          <td className="px-3 py-3 text-terminal-muted">{item.historical.trend}</td>
                          <td className={item.edge >= 0 ? "px-3 py-3 text-terminal-green" : "px-3 py-3 text-terminal-red"}>
                            {item.edge.toFixed(1)}%
                          </td>
                          <td className="px-3 py-3">{money.format(item.premium)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            {activeTab === "AI Analyst" && selectedOption && selectedAnalysis && (
              <Panel title="AI Historical Analyst" icon={<BrainCircuit size={17} />}>
                <div className="grid gap-3 md:grid-cols-3">
                  <Metric label="Verdict" value={selectedAnalysis.stance} accent="cyan" />
                  <Metric label="Action" value={selectedAnalysis.action} accent="green" />
                  <Metric label="Confidence" value={`${selectedAnalysis.confidence}/100`} accent="amber" />
                </div>

                <div className="mt-4 rounded border border-terminal-edge bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-terminal-muted">
                    Historical AI Read
                  </div>
                  <p className="mt-2 text-sm leading-6 text-terminal-text">{selectedAnalysis.summary}</p>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <StrategyPlan analysis={selectedAnalysis} />
                  <AnalystList title="Why" items={selectedAnalysis.reasons} tone="green" />
                  <AnalystList title="Risks" items={selectedAnalysis.risks} tone="amber" />
                </div>
                <div className="mt-4">
                  <AnalystList title="Checklist" items={selectedAnalysis.checklist} tone="cyan" />
                </div>
              </Panel>
            )}

            {activeTab === "Macro" && selectedOption && selectedMacro && (
              <Panel title="Historical & Geopolitical Intelligence" icon={<Globe2 size={17} />}>
                <div className="grid gap-3 md:grid-cols-3">
                  <Metric label="Macro Risk" value={`${selectedMacro.riskScore}/100`} accent="amber" />
                  <Metric label="IV Regime" value={selectedMacro.ivRegime} accent="cyan" />
                  <Metric label="Position Scale" value={selectedMacro.positionScale} accent="green" />
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_330px]">
                  <div className="h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historicalStress}>
                        <CartesianGrid stroke="#1a342e" vertical={false} />
                        <XAxis dataKey="regime" stroke="#8eb2a8" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#8eb2a8" />
                        <Tooltip contentStyle={{ background: "#07110f", border: "1px solid #1a342e" }} />
                        <Bar dataKey="vol" fill="#5ee5ff" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="shock" fill="#ffcf5f" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {macroEvents.map((event) => (
                      <div key={event.theme} className="rounded border border-terminal-edge bg-black/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{event.theme}</div>
                            <div className="mt-1 text-xs text-terminal-muted">{event.source}</div>
                          </div>
                          <span className="rounded border border-terminal-amber/50 bg-terminal-amber/10 px-2 py-1 text-xs font-semibold text-terminal-amber">
                            {event.confidence}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-terminal-muted">{event.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            )}

            {activeTab === "Vol Surface" && (
              <Panel title={`${selectedOption?.symbol || "NVDA"} Volatility Surface`} icon={<LineChartIcon size={17} />}>
                <div className="h-[520px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volSurface}>
                      <CartesianGrid stroke="#1a342e" vertical={false} />
                      <XAxis dataKey="name" stroke="#8eb2a8" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={90} />
                      <YAxis stroke="#8eb2a8" />
                      <Tooltip contentStyle={{ background: "#07110f", border: "1px solid #1a342e" }} />
                      <Bar dataKey="iv" radius={[3, 3, 0, 0]}>
                        {volSurface.map((entry) => (
                          <Cell key={`${entry.dte}-${entry.moneyness}`} fill={entry.moneyness === 0 ? "#5ee5ff" : "#36f29b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            )}

            {activeTab === "Flow" && (
              <Panel title="Dark Pool & Whale Options Flow" icon={<Zap size={17} />} flush>
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  {whaleFlow.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => setSelected(item.symbol)}
                      className="rounded border border-terminal-edge bg-black/20 p-4 text-left hover:border-terminal-green/60"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-semibold text-white">{item.symbol}</div>
                          <div className="text-xs text-terminal-muted">{item.flow} print</div>
                        </div>
                        <SignalBadge signal={item.signal.signal} />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <MiniStat label="Premium" value={money.format(item.premium)} />
                        <MiniStat label="Volume" value={item.volume.toLocaleString()} />
                        <MiniStat label="OI" value={item.openInterest.toLocaleString()} />
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>
            )}

            {activeTab === "Strategy" && selectedOption && (
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
            )}

            {activeTab === "Risk" && (
              <Panel title="Portfolio Risk Engine" icon={<ShieldCheck size={17} />}>
                <div className="grid gap-3 md:grid-cols-3">
                  <Metric label="Gross Premium" value={money.format(grossPremium)} />
                  <Metric label="Delta Exposure" value={money.format(portfolioRisk)} accent="amber" />
                  <Metric label="Tail Floor" value={money.format(Math.min(...riskCurve.map((item) => item.pnl)))} accent="red" />
                </div>
                <div className="mt-4 h-[390px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={riskCurve}>
                      <CartesianGrid stroke="#1a342e" vertical={false} />
                      <XAxis dataKey="move" stroke="#8eb2a8" />
                      <YAxis stroke="#8eb2a8" />
                      <Tooltip contentStyle={{ background: "#07110f", border: "1px solid #1a342e" }} />
                      <Area type="monotone" dataKey="pnl" stroke="#5ee5ff" fill="#5ee5ff" fillOpacity={0.16} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            )}
          </section>

          <aside className="flex min-w-0 flex-col gap-4">
            <Panel title="Selected Contract" icon={<Gauge size={17} />}>
              {selectedOption && (
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
                    <MiniStat label="Options Data" value={selectedOption.dataSource === "real-options" ? "Real" : "Synthetic"} />
                    <MiniStat label="History Data" value={formatSource(selectedOption.historySource)} />
                    <MiniStat label="Data Quality" value={`${selectedOption.dataQuality}/100`} />
                    <MiniStat label="AI Action" value={selectedAnalysis?.action || selectedOption.signal.signal} />
                    <MiniStat label="Risk" value={selectedAnalysis?.riskLabel || "Medium"} />
                    <MiniStat label="Fair Value" value={`$${selectedOption.fairValue.toFixed(2)}`} />
                    <MiniStat
                      label={selectedOption.dataSource === "real-options" ? "Last Price" : "Model Price"}
                      value={`$${selectedOption.price.toFixed(2)}`}
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
              )}
            </Panel>

            <Panel title="Top AI Signals" icon={<BrainCircuit size={17} />}>
              <div className="space-y-3">
                {topSignals.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => setSelected(item.symbol)}
                    className="flex w-full items-center justify-between rounded border border-terminal-edge bg-black/20 px-3 py-2 text-left hover:border-terminal-cyan/50"
                  >
                    <div>
                      <div className="font-semibold text-white">{item.symbol}</div>
                      <div className="text-xs text-terminal-muted">{item.signal.confidence}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-terminal-green">{item.opportunityScore}</div>
                      <div className="text-xs text-terminal-muted">{analyzeHistorically(item).action}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Sector Heatmap" icon={<Activity size={17} />}>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sectors}>
                    <CartesianGrid stroke="#1a342e" vertical={false} />
                    <XAxis dataKey="sector" stroke="#8eb2a8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#8eb2a8" domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "#07110f", border: "1px solid #1a342e" }} />
                    <Line type="monotone" dataKey="score" stroke="#36f29b" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Panel({
  title,
  icon,
  children,
  flush = false
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded border border-terminal-edge bg-terminal-panel/92 shadow-glow">
      <div className="flex items-center gap-2 border-b border-terminal-edge px-4 py-3 text-sm font-semibold text-white">
        <span className="text-terminal-green">{icon}</span>
        {title}
      </div>
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  accent = "muted"
}: {
  label: string;
  value: string;
  accent?: "green" | "amber" | "red" | "cyan" | "muted";
}) {
  const color = {
    green: "text-terminal-green",
    amber: "text-terminal-amber",
    red: "text-terminal-red",
    cyan: "text-terminal-cyan",
    muted: "text-white"
  }[accent];

  return (
    <div className="rounded border border-terminal-edge bg-black/20 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-terminal-muted">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-terminal-edge bg-black/20 p-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-terminal-muted">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function formatSource(source: string) {
  const labels: Record<string, string> = {
    polygon: "Polygon",
    "stooq-free": "Stooq",
    "stooq-partial": "Stooq Partial",
    "finnhub-free": "Finnhub",
    "finnhub-partial": "Finnhub Partial",
    simulated: "Simulated",
    unknown: "Unknown"
  };

  return labels[source] || source;
}

function SignalBadge({ signal }: { signal: string }) {
  const color =
    signal === "BUY CALL"
      ? "border-terminal-green/50 bg-terminal-green/10 text-terminal-green"
      : signal === "BUY PUT"
        ? "border-terminal-cyan/50 bg-terminal-cyan/10 text-terminal-cyan"
        : signal === "SELL PUT"
          ? "border-terminal-amber/50 bg-terminal-amber/10 text-terminal-amber"
          : signal === "SELL CALL"
            ? "border-terminal-red/50 bg-terminal-red/10 text-terminal-red"
            : "border-terminal-edge bg-black/20 text-terminal-muted";

  return <span className={`rounded border px-2 py-1 text-xs font-semibold ${color}`}>{signal}</span>;
}

function StrategyCard({
  title,
  name,
  item
}: {
  title: string;
  name: string;
  item: TerminalOption;
}) {
  return (
    <div className="rounded border border-terminal-edge bg-black/20 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-terminal-muted">{title}</div>
      <div className="mt-2 text-lg font-semibold text-white">{name}</div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="Score" value={`${item.signal.score}`} />
        <MiniStat label="Risk" value={money.format(Math.max(item.price * 100, 100))} />
      </div>
    </div>
  );
}

function StrategyPlan({
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

function AnalystList({
  title,
  items,
  tone
}: {
  title: string;
  items: string[];
  tone: "green" | "amber" | "cyan";
}) {
  const color = {
    green: "text-terminal-green",
    amber: "text-terminal-amber",
    cyan: "text-terminal-cyan"
  }[tone];

  return (
    <div className="rounded border border-terminal-edge bg-black/20 p-4">
      <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${color}`}>{title}</div>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm leading-5 text-terminal-text">
            <CheckCircle2 className={`mt-0.5 shrink-0 ${color}`} size={15} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
