"use client";

import { Zap } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import { money } from "@/lib/utils";
import { Panel } from "./Panel";
import { MiniStat } from "./MiniStat";
import { SignalBadge } from "./SignalBadge";

interface FlowTabProps {
  whaleFlow: TerminalOption[];
  onSelect: (symbol: string) => void;
}

export function FlowTab({ whaleFlow, onSelect }: FlowTabProps) {
  return (
    <Panel title="Dark Pool & Whale Options Flow" icon={<Zap size={17} />} flush>
      <div className="grid gap-2 sm:gap-3 p-3 sm:p-4 grid-cols-1 sm:grid-cols-2">
        {whaleFlow.map((item) => (
          <button
            key={item.symbol}
            onClick={() => onSelect(item.symbol)}
            className="rounded border border-terminal-edge bg-black/20 p-3 sm:p-4 text-left hover:border-terminal-green/60"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-semibold text-white truncate">{item.symbol}</div>
                <div className="text-xs text-terminal-muted">{item.flow} print</div>
              </div>
              <SignalBadge signal={item.signal.signal} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
              <MiniStat label="Premium" value={money.format(item.premium)} />
              <MiniStat label="Volume" value={item.volume.toLocaleString()} />
              <MiniStat label="OI" value={item.openInterest.toLocaleString()} />
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}
