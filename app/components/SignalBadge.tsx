"use client";

export function SignalBadge({ signal }: { signal: string }) {
  const color =
    signal === "BUY CALL"
      ? "border-terminal-green/50 bg-terminal-green/10 text-terminal-green"
      : signal === "BUY PUT"
        ? "border-terminal-cyan/50 bg-terminal-cyan/10 text-terminal-cyan"
        : signal === "SELL PUT"
          ? "border-terminal-amber/50 bg-terminal-amber/10 text-terminal-amber"
          : signal === "SELL CALL"
            ? "border-terminal-red/50 bg-terminal-red/10 text-terminal-red"
            : "border-terminal-edge bg-black/20 text-terminal-muted";

  return <span className={`rounded border px-2 py-1 text-xs font-semibold ${color}`}>{signal}</span>;
}
