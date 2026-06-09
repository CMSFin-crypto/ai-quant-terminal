"use client";

import { Activity } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import { analyzeHistorically } from "@/lib/aiHistoricalAnalyst";
import { money, stockMoney, formatSource } from "@/lib/utils";
import { Panel } from "./Panel";
import { SignalBadge } from "./SignalBadge";

interface ScannerTabProps {
  filteredRankedData: TerminalOption[];
  selected: string;
  onSelect: (symbol: string) => void;
  selectedSector: string;
}

export function ScannerTab({ filteredRankedData, selected, onSelect, selectedSector }: ScannerTabProps) {
  return (
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
                onClick={() => onSelect(item.symbol)}
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
  );
}
