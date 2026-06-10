"use client";

import { useState, useCallback, useEffect } from "react";
import { Bell, BellRing, Plus, Trash2, Eye, TrendingUp, TrendingDown, Activity } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import { Panel } from "./Panel";

type AlertCondition = "above" | "below" | "iv_above" | "iv_below" | "score_above" | "score_below";
type AlertStatus = "watching" | "triggered";

type StockAlert = {
  id: string;
  symbol: string;
  condition: AlertCondition;
  value: number;
  status: AlertStatus;
  createdAt: number;
  triggeredAt?: number;
};

const CONDITION_LABELS: Record<AlertCondition, string> = {
  above: "Çmimi mbi",
  below: "Çmimi nën",
  iv_above: "IV mbi",
  iv_below: "IV nën",
  score_above: "Score mbi",
  score_below: "Score nën",
};

const CONDITION_ICONS: Record<AlertCondition, React.ReactNode> = {
  above: <TrendingUp size={12} className="text-terminal-green" />,
  below: <TrendingDown size={12} className="text-red-400" />,
  iv_above: <Activity size={12} className="text-terminal-amber" />,
  iv_below: <Activity size={12} className="text-terminal-cyan" />,
  score_above: <TrendingUp size={12} className="text-terminal-green" />,
  score_below: <TrendingDown size={12} className="text-red-400" />,
};

interface AlertsTabProps {
  data: TerminalOption[];
  onSelect: (symbol: string) => void;
}

export function AlertsTab({ data, onSelect }: AlertsTabProps) {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState("NVDA");
  const [newCondition, setNewCondition] = useState<AlertCondition>("above");
  const [newValue, setNewValue] = useState("");

  // Load alerts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("quant-alerts");
      if (saved) setAlerts(JSON.parse(saved));
    } catch {}
  }, []);

  // Save alerts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("quant-alerts", JSON.stringify(alerts));
    } catch {}
  }, [alerts]);

  // Check alert conditions against live data
  useEffect(() => {
    if (!data.length) return;

    setAlerts((prev) =>
      prev.map((alert) => {
        if (alert.status === "triggered") return alert;

        const stock = data.find((item) => item.symbol === alert.symbol);
        if (!stock) return alert;

        let triggered = false;
        switch (alert.condition) {
          case "above":
            triggered = stock.underlyingPrice > alert.value;
            break;
          case "below":
            triggered = stock.underlyingPrice < alert.value;
            break;
          case "iv_above":
            triggered = stock.iv * 100 > alert.value;
            break;
          case "iv_below":
            triggered = stock.iv * 100 < alert.value;
            break;
          case "score_above":
            triggered = stock.opportunityScore > alert.value;
            break;
          case "score_below":
            triggered = stock.opportunityScore < alert.value;
            break;
        }

        if (triggered) {
          return { ...alert, status: "triggered" as AlertStatus, triggeredAt: Date.now() };
        }
        return alert;
      })
    );
  }, [data]);

  const addAlert = useCallback(() => {
    const val = parseFloat(newValue);
    if (!newSymbol || isNaN(val) || val <= 0) return;

    const alert: StockAlert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      symbol: newSymbol.toUpperCase(),
      condition: newCondition,
      value: val,
      status: "watching",
      createdAt: Date.now(),
    };

    setAlerts((prev) => [alert, ...prev]);
    setShowForm(false);
    setNewValue("");
  }, [newSymbol, newCondition, newValue]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearTriggered = useCallback(() => {
    setAlerts((prev) => prev.filter((a) => a.status !== "triggered"));
  }, []);

  // Auto-scan for high-opportunity stocks
  const highScoreStocks = data
    .filter((item) => item.opportunityScore >= 75)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 8);

  const highIVStocks = data
    .filter((item) => item.iv > 0.5)
    .sort((a, b) => b.iv - a.iv)
    .slice(0, 5);

  const triggeredAlerts = alerts.filter((a) => a.status === "triggered");
  const watchingAlerts = alerts.filter((a) => a.status === "watching");

  return (
    <Panel title="Alerts & Scanner" icon={<Bell size={17} />}>
      {/* Triggered alerts */}
      {triggeredAlerts.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BellRing size={14} className="text-terminal-amber animate-pulse" />
              <span className="text-xs font-bold text-terminal-amber">ALERTA AKTIVE ({triggeredAlerts.length})</span>
            </div>
            <button
              onClick={clearTriggered}
              className="text-[10px] text-terminal-muted hover:text-white transition"
            >
              Pastro të gjitha
            </button>
          </div>
          <div className="space-y-1.5">
            {triggeredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-2 rounded border border-terminal-amber/40 bg-terminal-amber/[0.08] p-2 cursor-pointer hover:bg-terminal-amber/[0.14] transition"
                onClick={() => onSelect(alert.symbol)}
              >
                <BellRing size={13} className="text-terminal-amber shrink-0 animate-pulse" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white">{alert.symbol}</span>
                  <span className="text-xs text-terminal-amber ml-1.5">
                    {CONDITION_LABELS[alert.condition]} {alert.condition.includes("iv") ? `${alert.value}%` : alert.condition.includes("score") ? alert.value : `$${alert.value}`}
                  </span>
                </div>
                <span className="text-[10px] text-terminal-muted shrink-0">
                  {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleTimeString() : ""}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeAlert(alert.id); }}
                  className="text-terminal-muted/40 hover:text-red-400 transition shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Watching alerts */}
      {watchingAlerts.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-terminal-cyan" />
            <span className="text-xs font-bold text-terminal-cyan">NË VËZHGIM ({watchingAlerts.length})</span>
          </div>
          <div className="space-y-1.5">
            {watchingAlerts.map((alert) => {
              const stock = data.find((item) => item.symbol === alert.symbol);
              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-2 rounded border border-terminal-edge bg-black/20 p-2 cursor-pointer hover:border-terminal-cyan/40 transition"
                  onClick={() => onSelect(alert.symbol)}
                >
                  {CONDITION_ICONS[alert.condition]}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white">{alert.symbol}</span>
                    <span className="text-xs text-terminal-muted ml-1.5">
                      {CONDITION_LABELS[alert.condition]} {alert.condition.includes("iv") ? `${alert.value}%` : alert.condition.includes("score") ? alert.value : `$${alert.value}`}
                    </span>
                  </div>
                  {stock && (
                    <span className="text-[10px] text-terminal-muted shrink-0">
                      Tani: {alert.condition.includes("iv") ? `${(stock.iv * 100).toFixed(1)}%` : alert.condition.includes("score") ? stock.opportunityScore : `$${stock.underlyingPrice.toFixed(0)}`}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeAlert(alert.id); }}
                    className="text-terminal-muted/40 hover:text-red-400 transition shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add alert form */}
      <div className="mb-3">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded border border-dashed border-terminal-cyan/40 bg-terminal-cyan/[0.04] p-2 w-full text-xs text-terminal-cyan hover:bg-terminal-cyan/[0.1] transition"
          >
            <Plus size={13} />
            Shto Alertë të Re
          </button>
        ) : (
          <div className="rounded border border-terminal-cyan/30 bg-terminal-cyan/[0.05] p-3 space-y-2">
            <div className="text-xs font-bold text-terminal-cyan mb-1">Alertë e Re</div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="Simboli"
                className="rounded border border-terminal-edge bg-black/30 px-2 py-1.5 text-xs text-white placeholder-terminal-muted/50 focus:border-terminal-cyan focus:outline-none"
              />
              <select
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as AlertCondition)}
                className="rounded border border-terminal-edge bg-black/30 px-2 py-1.5 text-xs text-white focus:border-terminal-cyan focus:outline-none"
              >
                <option value="above">Çmimi mbi</option>
                <option value="below">Çmimi nën</option>
                <option value="iv_above">IV mbi</option>
                <option value="iv_below">IV nën</option>
                <option value="score_above">Score mbi</option>
                <option value="score_below">Score nën</option>
              </select>
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Vlera"
                className="rounded border border-terminal-edge bg-black/30 px-2 py-1.5 text-xs text-white placeholder-terminal-muted/50 focus:border-terminal-cyan focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addAlert}
                className="rounded bg-terminal-cyan/20 border border-terminal-cyan/40 px-3 py-1.5 text-xs font-semibold text-terminal-cyan hover:bg-terminal-cyan/30 transition"
              >
                Krijo
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded border border-terminal-edge px-3 py-1.5 text-xs text-terminal-muted hover:text-white transition"
              >
                Anulo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Auto Scanner */}
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={14} className="text-terminal-green" />
          <span className="text-xs font-bold text-terminal-green">SKANIM AUTOMATIK</span>
          <span className="text-[10px] text-terminal-muted">— mundësi me Score të lartë</span>
        </div>

        {highScoreStocks.length > 0 ? (
          <div className="space-y-1">
            {highScoreStocks.map((stock) => (
              <div
                key={stock.symbol}
                className="flex items-center gap-2 rounded border border-terminal-green/20 bg-terminal-green/[0.04] p-2 cursor-pointer hover:bg-terminal-green/[0.1] transition"
                onClick={() => onSelect(stock.symbol)}
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    stock.opportunityScore >= 85 ? "bg-terminal-green" : "bg-terminal-amber"
                  }`}
                />
                <span className="text-xs font-bold text-white">{stock.symbol}</span>
                <span className="text-[10px] text-terminal-muted">{stock.sector}</span>
                <span className="ml-auto text-xs font-mono text-terminal-green">{stock.opportunityScore}</span>
                <span className="text-[10px] text-terminal-muted">Score</span>
                <span className="text-[10px] text-terminal-muted ml-2">
                  IV {(stock.iv * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-terminal-muted/50 p-2">
            Duke ngarkuar të dhënat...
          </div>
        )}
      </div>

      {/* High IV Scanner */}
      {highIVStocks.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-terminal-amber" />
            <span className="text-xs font-bold text-terminal-amber">IV E LARTË</span>
            <span className="text-[10px] text-terminal-muted">— kandidatë për SELL premium</span>
          </div>
          <div className="space-y-1">
            {highIVStocks.map((stock) => (
              <div
                key={stock.symbol}
                className="flex items-center gap-2 rounded border border-terminal-amber/20 bg-terminal-amber/[0.04] p-2 cursor-pointer hover:bg-terminal-amber/[0.1] transition"
                onClick={() => onSelect(stock.symbol)}
              >
                <div className="w-2 h-2 rounded-full bg-terminal-amber shrink-0" />
                <span className="text-xs font-bold text-white">{stock.symbol}</span>
                <span className="text-[10px] text-terminal-muted">{stock.sector}</span>
                <span className="ml-auto text-xs font-mono text-terminal-amber">{(stock.iv * 100).toFixed(1)}%</span>
                <span className="text-[10px] text-terminal-muted">IV</span>
                <span className="text-[10px] text-terminal-muted ml-2">
                  Score {stock.opportunityScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No alerts message */}
      {alerts.length === 0 && (
        <div className="text-center py-4">
          <Bell size={28} className="mx-auto text-terminal-muted/30 mb-2" />
          <div className="text-xs text-terminal-muted/60">
            Nuk keni alarme aktive. Klikoni &quot;Shto Alertë të Re&quot; për të filluar.
          </div>
        </div>
      )}
    </Panel>
  );
}
