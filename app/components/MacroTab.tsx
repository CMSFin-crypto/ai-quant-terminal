"use client";

import { Globe2 } from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import type { TerminalOption } from "@/lib/workstation";
import type { MacroResult } from "@/lib/macroIntelligence";
import { macroEvents } from "@/lib/macroIntelligence";
import { Panel } from "./Panel";
import { Metric } from "./Metric";

interface MacroTabProps {
  selectedMacro: MacroResult;
  historicalStress: { regime: string; vol: number; shock: number }[];
}

export function MacroTab({ selectedMacro, historicalStress }: MacroTabProps) {
  return (
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
  );
}
