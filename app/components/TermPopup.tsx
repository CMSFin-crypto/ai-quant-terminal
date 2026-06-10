"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { getMetricDef } from "@/lib/metricDefs";

/**
 * Reusable clickable term popup.
 * Wraps any inline content — when clicked, shows a portal popup with
 * Çfarë është / Si përdoret / Tip sections in Albanian.
 */
export function TermPopup({ termKey, children }: { termKey: string; children: React.ReactNode }) {
  const def = getMetricDef(termKey);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 360))
      });
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (open) {
      setOpen(false);
    } else {
      updatePos();
      setOpen(true);
    }
  }, [open, updatePos]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleDocClick(e: MouseEvent) {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [open]);

  // Close on scroll / resize
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Update position when open
  useEffect(() => {
    if (open) updatePos();
  }, [open, updatePos]);

  if (!def) return <>{children}</>;

  return (
    <>
      <span
        ref={triggerRef}
        className="cursor-pointer hover:text-terminal-cyan transition-colors"
        onClick={handleClick}
      >
        {children}
      </span>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[9999] w-[320px] sm:w-[360px] rounded-lg border border-terminal-cyan/50 bg-[#091916] shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,200,180,0.08)] p-3.5"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div>
              <span className="text-sm font-bold text-terminal-cyan">{def.term}</span>
              <span className="ml-2 text-[11px] text-terminal-muted">{def.full}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="text-terminal-muted/50 hover:text-white text-xs leading-none"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-xs leading-[1.6]">
            <div>
              <span className="text-terminal-green font-semibold">Çfarë është: </span>
              <span className="text-terminal-text/90">{def.desc}</span>
            </div>
            <div>
              <span className="text-terminal-amber font-semibold">Si përdoret: </span>
              <span className="text-terminal-text/90">{def.use}</span>
            </div>
            <div>
              <span className="text-terminal-cyan font-semibold">Tip: </span>
              <span className="text-terminal-text/90">{def.tip}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-terminal-edge text-[10px] text-terminal-muted/60 text-right">
            Klikoni kudo për ta mbyllur
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * Metric box with clickable label popup.
 * Same visual style as Metric, but the label opens a TermPopup.
 */
export function MetricWithPopup({ label, value, accent = "muted", termKey }: {
  label: string;
  value: string;
  accent?: "green" | "amber" | "red" | "cyan" | "muted";
  termKey: string;
}) {
  const color = {
    green: "text-terminal-green",
    amber: "text-terminal-amber",
    red: "text-terminal-red",
    cyan: "text-terminal-cyan",
    muted: "text-white"
  }[accent];

  return (
    <div className="rounded border border-terminal-edge bg-black/20 px-2.5 py-1.5 sm:px-3 sm:py-2">
      <TermPopup termKey={termKey}>
        <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.14em] text-terminal-muted flex items-center gap-1">
          {label}
          <span className="text-[8px] opacity-50">ⓘ</span>
        </div>
      </TermPopup>
      <div className={`mt-0.5 sm:mt-1 text-xs sm:text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}
