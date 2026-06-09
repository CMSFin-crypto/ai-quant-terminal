"use client";

import { LineChart as LineChartIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Panel } from "./Panel";

interface VolSurfaceTabProps {
  volSurface: { name: string; dte: number; moneyness: number; iv: number }[];
  symbol: string;
}

export function VolSurfaceTab({ volSurface, symbol }: VolSurfaceTabProps) {
  return (
    <Panel title={`${symbol} Volatility Surface`} icon={<LineChartIcon size={17} />}>
      <div className="h-[320px] sm:h-[420px] lg:h-[520px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={volSurface}>
            <CartesianGrid stroke="#1a342e" vertical={false} />
            <XAxis dataKey="name" stroke="#8eb2a8" tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={80} />
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
  );
}
