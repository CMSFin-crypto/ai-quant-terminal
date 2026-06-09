"use client";

import type { TerminalOption } from "@/lib/workstation";
import { money } from "@/lib/utils";
import { MiniStat } from "./MiniStat";

export function StrategyCard({
  title,
  name,
  item
}: {
  title: string;
  name: string;
  item: TerminalOption;
}) {
  return (
    <div className="rounded border border-terminal-edge bg-black/20 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-terminal-muted">{title}</div>
      <div className="mt-2 text-lg font-semibold text-white">{name}</div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="Score" value={`${item.signal.score}`} />
        <MiniStat label="Risk" value={money.format(Math.max(item.price * 100, 100))} />
      </div>
    </div>
  );
}
