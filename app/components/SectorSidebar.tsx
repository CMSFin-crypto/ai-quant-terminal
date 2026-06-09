"use client";

import { BarChart3 } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import { Panel } from "./Panel";

interface SectorSidebarProps {
  sectors: { sector: string; score: number; premium: number; iv: number }[];
  data: TerminalOption[];
  selectedSector: TerminalOption["sector"] | "All";
  rankedData: TerminalOption[];
  selected: string;
  onSelectSector: (sector: TerminalOption["sector"] | "All", firstSymbol: string) => void;
}

export function SectorSidebar({
  sectors,
  data,
  selectedSector,
  rankedData,
  selected,
  onSelectSector
}: SectorSidebarProps) {
  return (
    <Panel title="Sectors" icon={<BarChart3 size={17} />}>
      <div className="space-y-2">
        <button
          onClick={() => {
            onSelectSector("All", rankedData[0]?.symbol || selected);
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
              onSelectSector(sector.sector as TerminalOption["sector"], firstInSector?.symbol || selected);
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
  );
}
