"use client";

import { ShieldCheck } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { money } from "@/lib/utils";
import { Panel } from "./Panel";
import { Metric } from "./Metric";

interface RiskTabProps {
  grossPremium: number;
  portfolioRisk: number;
  riskCurve: { move: string; pnl: number }[];
}

export function RiskTab({ grossPremium, portfolioRisk, riskCurve }: RiskTabProps) {
  return (
    <Panel title="Portfolio Risk Engine" icon={<ShieldCheck size={17} />}>
      <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3">
        <Metric label="Gross Premium" value={money.format(grossPremium)} />
        <Metric label="Delta Exposure" value={money.format(portfolioRisk)} accent="amber" />
        <Metric label="Tail Floor" value={money.format(Math.min(...riskCurve.map((item) => item.pnl)))} accent="red" />
      </div>
      <div className="mt-3 sm:mt-4 h-[280px] sm:h-[340px] lg:h-[390px]">
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
  );
}
