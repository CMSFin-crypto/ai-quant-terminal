"use client";

import { Bot, RefreshCw } from "lucide-react";
import { Panel } from "./Panel";

const tabs = ["Scanner", "AI Analyst", "IV/HV", "POP Calc", "P&L", "Vol Skew", "Vol Cone", "Strategy Builder", "Compare", "Backtest", "Monte Carlo", "Alerts", "Macro", "Vol Surface", "Flow", "Strategy", "Risk"] as const;
type Tab = (typeof tabs)[number];

interface CommandPanelProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onRefresh: () => void;
  refreshDisabled: boolean;
  refreshCountdown: number;
}

export function CommandPanel({
  activeTab,
  onTabChange,
  onRefresh,
  refreshDisabled,
  refreshCountdown
}: CommandPanelProps) {
  return (
    <Panel title="Command" icon={<Bot size={17} />}>
      <button
        onClick={onRefresh}
        disabled={refreshDisabled}
        className="flex h-11 w-full items-center justify-center gap-2 rounded border border-terminal-green/40 bg-terminal-green/10 text-sm font-semibold text-terminal-green transition hover:bg-terminal-green/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw size={16} className={refreshDisabled ? "animate-spin" : ""} />
        {refreshDisabled ? `Refresh (${refreshCountdown}s)` : "Refresh Scanner"}
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
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
  );
}

export { tabs, type Tab };
