"use client";

export function Metric({
  label,
  value,
  accent = "muted"
}: {
  label: string;
  value: string;
  accent?: "green" | "amber" | "red" | "cyan" | "muted";
}) {
  const color = {
    green: "text-terminal-green",
    amber: "text-terminal-amber",
    red: "text-terminal-red",
    cyan: "text-terminal-cyan",
    muted: "text-white"
  }[accent];

  return (
    <div className="rounded border border-terminal-edge bg-black/20 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-terminal-muted">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}
