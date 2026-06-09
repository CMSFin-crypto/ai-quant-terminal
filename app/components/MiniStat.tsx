"use client";

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-terminal-edge bg-black/20 p-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-terminal-muted">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
