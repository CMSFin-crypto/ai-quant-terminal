"use client";

import { Activity } from "lucide-react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Panel } from "./Panel";

interface SectorHeatmapPanelProps {
  sectors: { sector: string; score: number; premium: number; iv: number }[];
}

export function SectorHeatmapPanel({ sectors }: SectorHeatmapPanelProps) {
  return (
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
  );
}
