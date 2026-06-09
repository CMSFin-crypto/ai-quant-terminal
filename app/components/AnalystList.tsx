"use client";

import { CheckCircle2 } from "lucide-react";

export function AnalystList({
  title,
  items,
  tone
}: {
  title: string;
  items: string[];
  tone: "green" | "amber" | "cyan";
}) {
  const color = {
    green: "text-terminal-green",
    amber: "text-terminal-amber",
    cyan: "text-terminal-cyan"
  }[tone];

  return (
    <div className="rounded border border-terminal-edge bg-black/20 p-4">
      <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${color}`}>{title}</div>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm leading-5 text-terminal-text">
            <CheckCircle2 className={`mt-0.5 shrink-0 ${color}`} size={15} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
