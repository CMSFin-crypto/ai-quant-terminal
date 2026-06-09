"use client";

import type { TerminalOption } from "@/lib/workstation";

interface SectorTabsProps {
  sectors: { sector: string; score: number; premium: number; iv: number }[];
  data: TerminalOption[];
  selectedSector: TerminalOption["sector"] | "All";
  rankedData: TerminalOption[];
  selected: string;
  onSelectSector: (sector: TerminalOption["sector"] | "All", firstSymbol: string) => void;
}

export function SectorTabs({
  sectors,
  data,
  selectedSector,
  rankedData,
  selected,
  onSelectSector
}: SectorTabsProps) {
  return (
    <div className="thin-scrollbar flex gap-2 overflow-x-auto pb-1">
      {/* All sectors tab */}
      <button
        onClick={() => onSelectSector("All", rankedData[0]?.symbol || selected)}
        className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
          selectedSector === "All"
            ? "border-terminal-cyan bg-terminal-cyan/10 text-terminal-cyan"
            : "border-terminal-edge bg-black/20 text-terminal-muted hover:border-terminal-green/50 hover:text-white"
        }`}
      >
        All <span className="ml-1 text-[10px] opacity-70">{data.length}</span>
      </button>

      {/* Individual sector tabs */}
      {sectors.map((sector) => (
        <button
          key={sector.sector}
          onClick={() => {
            const firstInSector = rankedData.find((item) => item.sector === sector.sector);
            onSelectSector(sector.sector as TerminalOption["sector"], firstInSector?.symbol || selected);
          }}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
            selectedSector === sector.sector
              ? "border-terminal-cyan bg-terminal-cyan/10 text-terminal-cyan"
              : "border-terminal-edge bg-black/20 text-terminal-muted hover:border-terminal-green/50 hover:text-white"
          }`}
        >
          {sector.sector} <span className="ml-1 text-[10px] opacity-70">{sector.score}</span>
        </button>
      ))}
    </div>
  );
}
