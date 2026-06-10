"use client";

import { GitBranch, TrendingUp, TrendingDown, BarChart3, Info, ArrowLeftRight, AlertTriangle } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  ComposedChart,
  Area
} from "recharts";
import type { TerminalOption } from "@/lib/workstation";
import { generateVolSkew, type SkewPoint } from "@/lib/volAnalytics";
import { Panel } from "./Panel";
import { Metric } from "./Metric";

interface VolSkewTabProps {
  selectedOption: TerminalOption;
}

export function VolSkewTab({ selectedOption }: VolSkewTabProps) {
  const skewData = generateVolSkew(selectedOption);
  const spot = selectedOption.underlyingPrice;
  const strikeStep = spot >= 500 ? 10 : spot >= 200 ? 5 : spot >= 50 ? 2.5 : 1;
  const atmStrike = Math.round(spot / strikeStep) * strikeStep;

  // Find ATM point
  const atmIndex = skewData.findIndex(p => p.strike === atmStrike);
  const atmPoint = skewData[atmIndex] || skewData[Math.floor(skewData.length / 2)];

  // ─── OTM Put vs OTM Call IV Comparison ────────────────────────────────
  // Extract OTM puts (strikes below spot) and OTM calls (strikes above spot)
  const otmPuts = skewData.filter(p => p.strike < spot);
  const otmCalls = skewData.filter(p => p.strike > spot);

  // Match by delta: for each OTM put delta, find closest OTM call with same |delta|
  const otmComparisonData = otmPuts.map((putPoint, i) => {
    const callPoint = otmCalls[otmCalls.length - 1 - i];
    if (!callPoint) return null;
    const putAbsDelta = Math.abs(putPoint.putDelta);
    const callAbsDelta = Math.abs(callPoint.callDelta);
    return {
      name: `${(putAbsDelta * 100).toFixed(0)}Δ`,
      putDeltaLabel: `${putPoint.putDelta}`,
      callDeltaLabel: `${callPoint.callDelta}`,
      otmPutIV: putPoint.iv,
      otmCallIV: callPoint.iv,
      ivDiff: Number((putPoint.iv - callPoint.iv).toFixed(1)),
      putStrike: putPoint.strike,
      callStrike: callPoint.strike,
      putPrice: putPoint.putPrice,
      callPrice: callPoint.callPrice,
    };
  }).filter(Boolean) as {
    name: string;
    putDeltaLabel: string;
    callDeltaLabel: string;
    otmPutIV: number;
    otmCallIV: number;
    ivDiff: number;
    putStrike: number;
    callStrike: number;
    putPrice: number;
    callPrice: number;
  }[];

  // Calculate skew metrics
  const deepOTMPutIV = skewData[2]?.iv || 0;  // Deep OTM put (low strikes)
  const deepOTMCallIV = skewData[skewData.length - 3]?.iv || 0;  // OTM call
  const putSkew = atmPoint.iv > 0 ? ((deepOTMPutIV - atmPoint.iv) / atmPoint.iv * 100) : 0;
  const callSkew = atmPoint.iv > 0 ? ((deepOTMCallIV - atmPoint.iv) / atmPoint.iv * 100) : 0;
  const isSmile = putSkew > 5 && callSkew > 3;
  const isSmirk = putSkew > 8 && callSkew < 2;

  // Risk Reversal: 25-delta call - 25-delta put (approx from skew data)
  const riskReversal = otmComparisonData.length >= 2
    ? otmComparisonData[1].callPrice - otmComparisonData[1].putPrice
    : 0;
  const skewRatio = deepOTMCallIV > 0 ? deepOTMPutIV / deepOTMCallIV : 1;

  // Average OTM put IV vs OTM call IV
  const avgOTMPutIV = otmPuts.length > 0
    ? otmPuts.reduce((sum, p) => sum + p.iv, 0) / otmPuts.length
    : 0;
  const avgOTMCallIV = otmCalls.length > 0
    ? otmCalls.reduce((sum, p) => sum + p.iv, 0) / otmCalls.length
    : 0;

  return (
    <Panel title="Volatility Smile / Skew Analysis" icon={<GitBranch size={17} />}>
      {/* Skew type identification */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-4">
        <Metric
          label="Tipi i Skew"
          value={isSmile ? "Smile" : isSmirk ? "Smirk (Put Skew)" : "Afër Flat"}
          accent={isSmirk ? "amber" : isSmile ? "cyan" : "green"}
        />
        <Metric
          label="IV ATM"
          value={`${atmPoint.iv.toFixed(1)}%`}
          accent="cyan"
        />
        <Metric
          label="Put Skew"
          value={`${putSkew > 0 ? "+" : ""}${putSkew.toFixed(1)}%`}
          accent={putSkew > 10 ? "amber" : "green"}
        />
        <Metric
          label="Call Skew"
          value={`${callSkew > 0 ? "+" : ""}${callSkew.toFixed(1)}%`}
          accent="cyan"
        />
      </div>

      {/* ─── OTM Put vs OTM Call IV Comparison Section ───────────────── */}
      <div className="mt-5">
        <div className="flex items-center gap-2 mb-2">
          <ArrowLeftRight size={15} className="text-terminal-cyan" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted">
            OTM Put vs OTM Call — Krahasimi i IV
          </h3>
        </div>

        {/* Key metrics for OTM comparison */}
        <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-5 mb-3">
          <Metric
            label="OTM Put IV (Mes.)"
            value={`${avgOTMPutIV.toFixed(1)}%`}
            accent="amber"
          />
          <Metric
            label="OTM Call IV (Mes.)"
            value={`${avgOTMCallIV.toFixed(1)}%`}
            accent="green"
          />
          <Metric
            label="Skew Ratio"
            value={skewRatio.toFixed(2)}
            accent={skewRatio > 1.3 ? "amber" : skewRatio > 1.1 ? "cyan" : "green"}
          />
          <Metric
            label="Risk Reversal"
            value={`$${riskReversal.toFixed(2)}`}
            accent={riskReversal < 0 ? "amber" : "green"}
          />
          <Metric
            label="IV Spread (P-C)"
            value={`${(avgOTMPutIV - avgOTMCallIV).toFixed(1)}%`}
            accent={avgOTMPutIV - avgOTMCallIV > 5 ? "amber" : "green"}
          />
        </div>

        {/* Skew ratio interpretation */}
        <div className={`rounded border p-3 mb-3 ${
          skewRatio > 1.4
            ? "border-terminal-amber/40 bg-terminal-amber/[0.08]"
            : skewRatio > 1.15
              ? "border-terminal-cyan/30 bg-terminal-cyan/[0.05]"
              : "border-terminal-green/30 bg-terminal-green/[0.05]"
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={14} className={
              skewRatio > 1.4 ? "text-terminal-amber" : skewRatio > 1.15 ? "text-terminal-cyan" : "text-terminal-green"
            } />
            <span className={`text-xs font-bold ${
              skewRatio > 1.4 ? "text-terminal-amber" : skewRatio > 1.15 ? "text-terminal-cyan" : "text-terminal-green"
            }`}>
              {skewRatio > 1.4
                ? "SKEW E LARTË — OTM Puts janë shumë më të shtrenjta se OTM Calls"
                : skewRatio > 1.15
                  ? "SKEW NORMALE — OTM Puts kanë premium modest mbi OTM Calls"
                  : "SKEW E ULËT — OTM Puts dhe Calls kanë IV të ngjashme"}
            </span>
          </div>
          <p className="text-xs leading-5 text-terminal-text/85">
            {skewRatio > 1.4
              ? `Skew Ratio ${skewRatio.toFixed(2)} tregon se OTM puts kushtojnë ${((skewRatio - 1) * 100).toFixed(0)}% më shumë se OTM calls me delta të ngjashme. Kjo do të thotë se tregu paguan një "crash premium" të lartë për mbrojtje nga rënia. Nëse shisni OTM puts, jeni duke marrë rrezik të madh për premium relativisht të ulët. Nëse blini OTM calls, ato janë relativisht të lira — mund të jenë një mundësi spekulative e leverdishme.`
              : skewRatio > 1.15
                ? `Skew Ratio ${skewRatio.toFixed(2)} është brenda normës. OTM puts kanë IV pak më të lartë se OTM calls, gjë e cila është e zakonshme sepse investitorët institucionalë mbrohen nga rënia. Nuk ka asnjë sinjal ekstrem tregu në këtë moment.`
                : `Skew Ratio ${skewRatio.toFixed(2)} është afër 1.0 — OTM puts dhe calls kanë IV pothuajse të njëjtë. Kjo është e rrallë dhe mund të ndodhë në tregje me volatilitet të ulët ose para ngjarjeve simetrike. Nuk ka frikë të veçantë nga rënia.`}
          </p>
        </div>

        {/* OTM Put vs OTM Call IV chart — grouped bar chart by delta */}
        <div className="h-[280px] sm:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={otmComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#1a342e" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#8eb2a8"
                tick={{ fontSize: 10 }}
                label={{ value: "Delta Absolut", position: "insideBottom", offset: -2, fill: "#8eb2a8", fontSize: 10 }}
              />
              <YAxis
                stroke="#8eb2a8"
                tick={{ fontSize: 10 }}
                unit="%"
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#091916",
                  border: "1px solid rgba(94,229,255,0.3)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#e5e7eb"
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    otmPutIV: "OTM Put IV",
                    otmCallIV: "OTM Call IV",
                    ivDiff: "IV Spread (P-C)"
                  };
                  return [`${value.toFixed(1)}%`, labels[name] || name];
                }}
                labelFormatter={(label: string) => `Delta: ${label}`}
              />
              <Legend
                formatter={(value: string) =>
                  value === "otmPutIV" ? "OTM Put IV" :
                  value === "otmCallIV" ? "OTM Call IV" :
                  "IV Spread"
                }
              />
              <Bar dataKey="otmPutIV" fill="#f59e0b" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
              <Bar dataKey="otmCallIV" fill="#36f29b" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* IV Difference (Put IV - Call IV) chart */}
        <div className="mt-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-terminal-muted mb-2">
            IV Spread sipas Deltës — Sa më shumë paguhen OTM Puts vs OTM Calls
          </h4>
          <div className="h-[200px] sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={otmComparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="#1a342e" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#8eb2a8"
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  stroke="#8eb2a8"
                  tick={{ fontSize: 10 }}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#091916",
                    border: "1px solid rgba(94,229,255,0.3)",
                    borderRadius: 8,
                    fontSize: 11,
                    color: "#e5e7eb"
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "ivDiff") return [`${value.toFixed(1)}%`, "Put IV - Call IV"];
                    return [value, name];
                  }}
                  labelFormatter={(label: string) => `Delta: ${label}`}
                />
                <ReferenceLine y={0} stroke="#8eb2a8" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="ivDiff"
                  fill="#f59e0b"
                  fillOpacity={0.15}
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="ivDiff"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ fill: "#f59e0b", r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* OTM Put vs Call comparison table */}
        <div className="mt-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-terminal-muted mb-2">
            Tabela OTM Put vs OTM Call
          </h4>
          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-terminal-edge text-terminal-muted">
                  <th className="py-2 px-1.5 text-left">Delta</th>
                  <th className="py-2 px-1.5 text-right text-terminal-amber">Put Strike</th>
                  <th className="py-2 px-1.5 text-right text-terminal-amber">Put IV</th>
                  <th className="py-2 px-1.5 text-right text-terminal-amber">Put Price</th>
                  <th className="py-2 px-1.5 text-right text-terminal-green">Call Strike</th>
                  <th className="py-2 px-1.5 text-right text-terminal-green">Call IV</th>
                  <th className="py-2 px-1.5 text-right text-terminal-green">Call Price</th>
                  <th className="py-2 px-1.5 text-right">IV Spread</th>
                </tr>
              </thead>
              <tbody>
                {otmComparisonData.map((row, i) => (
                  <tr key={i} className="border-b border-terminal-edge/50">
                    <td className="py-1.5 px-1.5 text-terminal-cyan font-semibold">{row.name}</td>
                    <td className="py-1.5 px-1.5 text-right text-terminal-amber">${row.putStrike}</td>
                    <td className="py-1.5 px-1.5 text-right text-terminal-amber">{row.otmPutIV.toFixed(1)}%</td>
                    <td className="py-1.5 px-1.5 text-right text-terminal-amber">${row.putPrice.toFixed(2)}</td>
                    <td className="py-1.5 px-1.5 text-right text-terminal-green">${row.callStrike}</td>
                    <td className="py-1.5 px-1.5 text-right text-terminal-green">{row.otmCallIV.toFixed(1)}%</td>
                    <td className="py-1.5 px-1.5 text-right text-terminal-green">${row.callPrice.toFixed(2)}</td>
                    <td className={`py-1.5 px-1.5 text-right font-semibold ${row.ivDiff > 5 ? "text-terminal-amber" : row.ivDiff > 2 ? "text-terminal-cyan" : "text-terminal-green"}`}>
                      {row.ivDiff > 0 ? "+" : ""}{row.ivDiff.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Volatility Smile Chart */}
      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Volatility Smile — IV sipas Strike
        </h3>
        <div className="h-[280px] sm:h-[340px] lg:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={skewData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#1a342e" vertical={false} />
              <XAxis
                dataKey="strike"
                stroke="#8eb2a8"
                tick={{ fontSize: 9 }}
                tickFormatter={(v: number) => `$${v}`}
              />
              <YAxis
                stroke="#8eb2a8"
                tick={{ fontSize: 10 }}
                unit="%"
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#091916",
                  border: "1px solid rgba(94,229,255,0.3)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#e5e7eb"
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = { iv: "IV" };
                  return [`${value.toFixed(1)}%`, labels[name] || name];
                }}
                labelFormatter={(label: number) => `Strike: $${label}`}
              />
              <ReferenceLine
                x={spot}
                stroke="#5ee5ff"
                strokeDasharray="4 2"
                strokeOpacity={0.7}
                label={{ value: `Undl $${spot.toFixed(0)}`, position: "top", fill: "#5ee5ff", fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="iv"
                stroke="#5ee5ff"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.strike === atmStrike) {
                    return <circle key="atm" cx={cx} cy={cy} r={5} fill="#5ee5ff" stroke="#fff" strokeWidth={1.5} />;
                  }
                  return <circle key={payload.strike} cx={cx} cy={cy} r={3} fill={payload.strike < spot ? "#f59e0b" : "#36f29b"} fillOpacity={0.7} />;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Call/Put IV comparison */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Çmimet e Call vs Put sipas Strike
        </h3>
        <div className="h-[220px] sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={skewData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#1a342e" vertical={false} />
              <XAxis
                dataKey="strike"
                stroke="#8eb2a8"
                tick={{ fontSize: 9 }}
                tickFormatter={(v: number) => `$${v}`}
                interval={2}
              />
              <YAxis stroke="#8eb2a8" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#091916",
                  border: "1px solid rgba(94,229,255,0.3)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#e5e7eb"
                }}
                formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === "callPrice" ? "Call" : "Put"]}
              />
              <Legend formatter={(value: string) => value === "callPrice" ? "Call Premium" : "Put Premium"} />
              <Bar dataKey="callPrice" fill="#36f29b" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
              <Bar dataKey="putPrice" fill="#f59e0b" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strike detail table */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted mb-2">
          Tabela e Detajuar sipas Strike
        </h3>
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-edge text-terminal-muted">
                <th className="py-2 px-1.5 text-left">Strike</th>
                <th className="py-2 px-1.5 text-left">Moneyness</th>
                <th className="py-2 px-1.5 text-right">IV</th>
                <th className="py-2 px-1.5 text-right">Call</th>
                <th className="py-2 px-1.5 text-right">Put</th>
                <th className="py-2 px-1.5 text-right">C-Delta</th>
                <th className="py-2 px-1.5 text-right">P-Delta</th>
              </tr>
            </thead>
            <tbody>
              {skewData.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-terminal-edge/50 ${row.strike === atmStrike ? "bg-terminal-cyan/[0.08]" : ""}`}
                >
                  <td className={`py-1.5 px-1.5 ${row.strike === atmStrike ? "text-terminal-cyan font-bold" : "text-terminal-text"}`}>
                    ${row.strike} {row.strike === atmStrike ? "★" : ""}
                  </td>
                  <td className={`py-1.5 px-1.5 ${
                    row.moneyness === "100%" ? "text-terminal-cyan" :
                    parseInt(row.moneyness) < 100 ? "text-terminal-amber" : "text-terminal-green"
                  }`}>
                    {row.moneyness}
                  </td>
                  <td className="py-1.5 px-1.5 text-right text-terminal-cyan">{row.iv.toFixed(1)}%</td>
                  <td className="py-1.5 px-1.5 text-right text-terminal-green">${row.callPrice.toFixed(2)}</td>
                  <td className="py-1.5 px-1.5 text-right text-terminal-amber">${row.putPrice.toFixed(2)}</td>
                  <td className="py-1.5 px-1.5 text-right text-terminal-muted">{row.callDelta}</td>
                  <td className="py-1.5 px-1.5 text-right text-terminal-muted">{row.putDelta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Educational note */}
      <div className="mt-3 rounded border border-terminal-edge bg-black/20 p-3 text-xs text-terminal-text/60 leading-5">
        <b>Volatility Smile vs Skew:</b> Kur IV është e lartë në të dyja krahë (OTM calls + OTM puts), quhet &ldquo;smile&rdquo; — tregu priton lëvizje të mëdha. Kur vetëm OTM puts kanë IV të lartë, quhet &ldquo;smirk&rdquo; ose &ldquo;put skew&rdquo; — tregu frikësohet më shumë nga rënia. Put skew është më e zakonshme sepse investitorët paguajnë më shumë për mbrojtje (insurance) nga rënia. Skew Ratio mbi 1.3 tregon frikë të konsiderueshme — shitja e puts është rrezikuese, por blerja e calls mund të jetë e leverdishme.
      </div>
    </Panel>
  );
}
