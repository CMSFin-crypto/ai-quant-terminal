"use client";

import { useState, useRef, useEffect } from "react";
import { getMetricDef } from "@/lib/metricDefs";

export function MiniStat({ label, value }: { label: string; value: string }) {
  const [showInfo, setShowInfo] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const def = getMetricDef(label);

  // Close on click outside
  useEffect(() => {
    if (!showInfo) return;
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node) &&
          ref.current && !ref.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showInfo]);

  const handleLabelClick = (e: React.MouseEvent) => {
    if (!def) return;
    e.stopPropagation();
    if (showInfo) {
      setShowInfo(false);
      return;
    }
    // Position popup above the stat
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({
        top: rect.top - 8,
        left: rect.left
      });
    }
    setShowInfo(true);
  };

  return (
    <>
      <div ref={ref} className="rounded border border-terminal-edge bg-black/20 p-1.5 sm:p-2">
        <button
          onClick={handleLabelClick}
          className={`text-[9px] sm:text-[10px] uppercase tracking-[0.10em] sm:tracking-[0.12em] ${
            def ? "text-terminal-cyan cursor-pointer hover:text-terminal-cyan/80" : "text-terminal-muted"
          } flex items-center gap-1`}
          title={def ? `Click for info about ${label}` : undefined}
        >
          {label}
          {def && <span className="text-[8px] opacity-50">ⓘ</span>}
        </button>
        <div className="mt-0.5 sm:mt-1 truncate text-xs sm:text-sm font-semibold text-white">{value}</div>
      </div>

      {/* Info popup */}
      {showInfo && def && pos && (
        <div
          ref={popupRef}
          className="fixed z-[100] w-[300px] sm:w-[340px] rounded-lg border border-terminal-cyan/40 bg-[#0a1a16]/98 shadow-xl shadow-terminal-cyan/10 p-3 backdrop-blur-sm"
          style={{
            top: pos.top,
            left: Math.min(pos.left, window.innerWidth - 340),
            transform: "translateY(-100%)"
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <span className="text-sm font-bold text-terminal-cyan">{def.term}</span>
              <span className="ml-2 text-xs text-terminal-muted">{def.full}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
              className="text-terminal-muted hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-xs leading-4">
            <div>
              <span className="text-terminal-green font-semibold">Çfarë është:</span>
              <span className="ml-1 text-terminal-text/90">{def.desc}</span>
            </div>
            <div>
              <span className="text-terminal-amber font-semibold">Si përdoret:</span>
              <span className="ml-1 text-terminal-text/90">{def.use}</span>
            </div>
            <div>
              <span className="text-terminal-cyan font-semibold">Tip:</span>
              <span className="ml-1 text-terminal-text/90">{def.tip}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
