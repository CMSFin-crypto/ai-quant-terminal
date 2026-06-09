"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Radar, RefreshCw } from "lucide-react";

import { STOCKS, type Stock } from "@/lib/sectors";
import { calculateHistoricalMetrics, generateMockHistory } from "@/lib/historicalAnalytics";
import { analyzeHistorically } from "@/lib/aiHistoricalAnalyst";
import type { AnalystVerdict } from "@/lib/aiHistoricalAnalyst";
import {
  buildMockTerminalData,
  buildSyntheticOption,
  buildRiskCurve,
  buildVolSurface,
  normalizePolygonOption,
  pickOptionContract,
  type TerminalOption
} from "@/lib/workstation";
import { buildHistoricalStress, macroScore } from "@/lib/macroIntelligence";
import type { MacroResult } from "@/lib/macroIntelligence";
import { money } from "@/lib/utils";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { Panel } from "./components/Panel";
import { Metric } from "./components/Metric";
import { tabs, type Tab } from "./components/CommandPanel";
import { SectorTabs } from "./components/SectorTabs";
import { ScannerTab } from "./components/ScannerTab";
import { AIAnalystTab } from "./components/AIAnalystTab";
import { MacroTab } from "./components/MacroTab";
import { VolSurfaceTab } from "./components/VolSurfaceTab";
import { FlowTab } from "./components/FlowTab";
import { StrategyTab } from "./components/StrategyTab";
import { RiskTab } from "./components/RiskTab";
import { SelectedContractPanel } from "./components/SelectedContractPanel";
import { TopSignalsPanel } from "./components/TopSignalsPanel";
import { SectorHeatmapPanel } from "./components/SectorHeatmapPanel";
import { StockSearch } from "./components/StockSearch";

export default function Page() {
  const [data, setData] = useState<TerminalOption[]>([]);
  const [status, setStatus] = useState("Booting");
  const [activeTab, setActiveTab] = useState<Tab>("Scanner");
  const [selected, setSelected] = useState("NVDA");
  const [selectedSector, setSelectedSector] = useState<TerminalOption["sector"] | "All">("All");
  const [lastRefresh, setLastRefresh] = useState("--:--:--");
  const [refreshDisabled, setRefreshDisabled] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(0);
  const [customStocks, setCustomStocks] = useState<Stock[]>([]);

  // All stocks = predefined + custom searched
  const allStocks = useMemo(() => [...STOCKS, ...customStocks], [customStocks]);
  const existingSymbols = useMemo(() => allStocks.map((s) => s.symbol), [allStocks]);

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

  // --- Memoized expensive computations (improvement #2) ---
  const volSurface = useMemo(
    () => buildVolSurface(selectedOption?.symbol || "NVDA"),
    [selectedOption?.symbol]
  );

  const riskCurve = useMemo(
    () => selectedOption ? buildRiskCurve(selectedOption) : buildRiskCurve("NVDA"),
    [selectedOption]
  );

  const selectedMacro: MacroResult | null = useMemo(
    () => selectedOption ? macroScore(selectedOption) : null,
    [selectedOption]
  );

  const selectedAnalysis: AnalystVerdict | null = useMemo(
    () => selectedOption ? analyzeHistorically(selectedOption) : null,
    [selectedOption]
  );

  const historicalStress = useMemo(
    () => selectedOption ? buildHistoricalStress(selectedOption) : [],
    [selectedOption]
  );

  const portfolioRisk = useMemo(
    () => data.reduce((sum, item) => sum + Math.abs(item.delta) * item.premium, 0),
    [data]
  );

  const grossPremium = useMemo(
    () => data.reduce((sum, item) => sum + item.premium, 0),
    [data]
  );

  const highConviction = useMemo(
    () => data.filter((item) => item.signal.score >= 78).length,
    [data]
  );

  // --- useCallback for fetchAll (improvement #3) ---
  // Fetch in batches of 5 to avoid rate limits from Yahoo Finance and our own API
  const fetchAll = useCallback(async () => {
    setStatus("Syncing");
    const stocksToFetch = allStocks;
    const fallback = buildMockTerminalData(stocksToFetch);
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES_MS = 200;

    function delay(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function fetchOneStock(stock: Stock) {
      try {
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
        const quotePrice = Number(quoteJson?.price || optionsJson?.underlyingPrice || 0) || undefined;
        const optionsSource = optionsJson?.source || undefined;
        const contract = pickOptionContract(optionsJson?.results, historical, quotePrice);
        const finalHistorySource = hasRealHistory ? historySource : "simulated";

        return contract
          ? normalizePolygonOption(stock, contract, historical, quotePrice, finalHistorySource, optionsSource)
          : buildSyntheticOption(stock, historical, quotePrice, finalHistorySource);
      } catch {
        // If individual stock fetch fails, use synthetic data
        return buildSyntheticOption(stock);
      }
    }

    try {
      const responses: TerminalOption[] = [];

      // Process stocks in batches to avoid rate limiting
      for (let i = 0; i < stocksToFetch.length; i += BATCH_SIZE) {
        const batch = stocksToFetch.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(fetchOneStock));
        responses.push(...batchResults);

        // Update data progressively so the UI shows results as they come in
        setData([...responses]);

        // Small delay between batches to avoid rate limits
        if (i + BATCH_SIZE < stocksToFetch.length) {
          await delay(DELAY_BETWEEN_BATCHES_MS);
        }
      }

      setStatus("LIVE");
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {
      setData(fallback);
      setStatus("SIM MODE");
      setLastRefresh(new Date().toLocaleTimeString());
    }
  }, [allStocks]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (data.length && !data.some((item) => item.symbol === selected)) {
      setSelected(data[0].symbol);
    }
  }, [data, selected]);

  // --- Debounce refresh button (improvement #17) ---
  const handleRefresh = useCallback(() => {
    if (refreshDisabled) return;
    setRefreshDisabled(true);
    setRefreshCountdown(5);
    fetchAll();

    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setRefreshDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [fetchAll, refreshDisabled]);

  const handleSectorSelect = useCallback(
    (sector: TerminalOption["sector"] | "All", firstSymbol: string) => {
      setSelectedSector(sector);
      setActiveTab("Scanner");
      setSelected(firstSymbol);
    },
    []
  );

  // --- Add custom stock from search ---
  const handleAddStock = useCallback(
    async (symbol: string, name: string) => {
      const upperSymbol = symbol.toUpperCase();

      // If stock already exists, just select it and show it in scanner
      if (existingSymbols.includes(upperSymbol)) {
        setSelected(upperSymbol);
        setActiveTab("Scanner");
        setSelectedSector("All");
        return;
      }

      // Add the new stock to the custom list
      const newStock: Stock = {
        symbol: upperSymbol,
        name: name || upperSymbol,
        sector: "Tech", // Default sector for custom stocks
      };
      setCustomStocks((prev) => [...prev, newStock]);

      // Switch to scanner immediately so the user sees it
      setActiveTab("Scanner");
      setSelectedSector("All");
      setSelected(upperSymbol);

      // Immediately fetch data for this stock and add it to the terminal
      try {
        const [optionsRes, historyRes, quoteRes] = await Promise.all([
          fetch(`/api/options?symbol=${upperSymbol}`),
          fetch(`/api/history?symbol=${upperSymbol}&days=365`),
          fetch(`/api/quote?symbol=${upperSymbol}`)
        ]);
        const [optionsJson, historyJson, quoteJson] = await Promise.all([
          optionsRes.json(),
          historyRes.json(),
          quoteRes.json()
        ]);
        const historySource = historyJson?.source || "unknown";
        const hasRealHistory = Array.isArray(historyJson?.results) && historyJson.results.length >= 90;
        const bars = hasRealHistory ? historyJson.results : generateMockHistory(upperSymbol);
        const historical = calculateHistoricalMetrics(bars);
        const quotePrice = Number(quoteJson?.price || optionsJson?.underlyingPrice || 0) || undefined;
        const optionsSource = optionsJson?.source || undefined;
        const contract = pickOptionContract(optionsJson?.results, historical, quotePrice);
        const finalHistorySource = hasRealHistory ? historySource : "simulated";

        const terminalOption = contract
          ? normalizePolygonOption(newStock, contract, historical, quotePrice, finalHistorySource, optionsSource)
          : buildSyntheticOption(newStock, historical, quotePrice, finalHistorySource);

        setData((prev) => [...prev, terminalOption]);
      } catch {
        // Even if fetch fails, add a synthetic version
        const synthetic = buildSyntheticOption(newStock);
        setData((prev) => [...prev, synthetic]);
      }
    },
    [existingSymbols]
  );

  const isLoading = status === "Booting" || status === "Syncing";

  return (
    <ErrorBoundary>
      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <main className="terminal-grid min-h-screen bg-terminal-bg text-terminal-text">
          <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
            <header className="flex flex-col gap-3 border-b border-terminal-edge pb-3 sm:pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm uppercase tracking-[0.20em] sm:tracking-[0.24em] text-terminal-green">
                    <Radar size={16} />
                    Ultra Hedge Fund Workstation V2
                  </div>
                  <h1 className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-normal text-white md:text-4xl lg:text-5xl">
                    Real Quant AI Terminal
                  </h1>
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 sm:grid-cols-4">
                  <Metric label="Status" value={status} accent={status === "LIVE" ? "green" : "amber"} />
                  <Metric label="Refresh" value={lastRefresh} />
                  <Metric label="Premium" value={money.format(grossPremium)} />
                  <Metric label="Signals" value={`${highConviction}/${data.length || 25}`} accent="cyan" />
                </div>
              </div>

              {/* Sector tabs as rubrics */}
              <SectorTabs
                sectors={sectors}
                data={data}
                selectedSector={selectedSector}
                rankedData={rankedData}
                selected={selected}
                onSelectSector={handleSectorSelect}
              />
            </header>

            <section className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
              <section className="min-w-0">
                {/* Horizontal tab bar + Refresh */}
                <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
                  <div className="thin-scrollbar flex gap-1 overflow-x-auto">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`shrink-0 rounded px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition ${
                          activeTab === tab
                            ? "bg-terminal-cyan/15 text-terminal-cyan border border-terminal-cyan/40"
                            : "text-terminal-muted hover:text-white border border-transparent hover:border-terminal-edge"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshDisabled}
                    className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded border border-terminal-green/40 bg-terminal-green/10 px-2.5 sm:px-3 text-xs font-semibold text-terminal-green transition hover:bg-terminal-green/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={13} className={refreshDisabled ? "animate-spin" : ""} />
                    <span className="hidden sm:inline">{refreshDisabled ? `${refreshCountdown}s` : "Refresh"}</span>
                  </button>
                </div>

                {activeTab === "Scanner" && (
                  <ScannerTab
                    filteredRankedData={filteredRankedData}
                    selected={selected}
                    onSelect={setSelected}
                    selectedSector={selectedSector}
                    selectedAnalysis={selectedAnalysis}
                  />
                )}

                {activeTab === "AI Analyst" && selectedOption && selectedAnalysis && (
                  <AIAnalystTab
                    selectedOption={selectedOption}
                    selectedAnalysis={selectedAnalysis}
                  />
                )}

                {activeTab === "Macro" && selectedOption && selectedMacro && (
                  <MacroTab
                    selectedMacro={selectedMacro}
                    historicalStress={historicalStress}
                  />
                )}

                {activeTab === "Vol Surface" && (
                  <VolSurfaceTab
                    volSurface={volSurface}
                    symbol={selectedOption?.symbol || "NVDA"}
                  />
                )}

                {activeTab === "Flow" && (
                  <FlowTab whaleFlow={whaleFlow} onSelect={setSelected} />
                )}

                {activeTab === "Strategy" && selectedOption && (
                  <StrategyTab
                    selectedOption={selectedOption}
                    selectedAnalysis={selectedAnalysis}
                  />
                )}

                {activeTab === "Risk" && (
                  <RiskTab
                    grossPremium={grossPremium}
                    portfolioRisk={portfolioRisk}
                    riskCurve={riskCurve}
                  />
                )}
              </section>

              <aside className="flex min-w-0 flex-col gap-3 sm:gap-4">
                <StockSearch
                  onAddStock={handleAddStock}
                  existingSymbols={existingSymbols}
                />

                {selectedOption && (
                  <SelectedContractPanel
                    selectedOption={selectedOption}
                    selectedAnalysis={selectedAnalysis}
                  />
                )}

                <TopSignalsPanel topSignals={topSignals} onSelect={setSelected} />

                <SectorHeatmapPanel sectors={sectors} />
              </aside>
            </section>
          </div>
        </main>
      )}
    </ErrorBoundary>
  );
}
