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
    <div className="rounded border border-terminal-edge bg-black/20 p-3 sm:p-4">
      <div className="text-[10px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.16em] text-terminal-muted">{title}</div>
      <div className="mt-1.5 sm:mt-2 text-base sm:text-lg font-semibold text-white">{name}</div>
      <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-1.5 sm:gap-2">
        <MiniStat label="Score" value={`${item.signal.score}`} />
        <MiniStat label="Risk" value={money.format(Math.max(item.price * 100, 100))} />
      </div>
    </div>
  );
}
