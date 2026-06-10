"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { getMetricDef } from "@/lib/metricDefs";

/* ─── Tooltip for column headers (hover + click) ──────────────────────── */

export function HeaderTooltip({ term, children }: { term: string; children: React.ReactNode }) {
  const def = getMetricDef(term);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false); // pinned = click-locked open
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 360))
      });
    }
  }, []);

  const show = useCallback(() => {
    clearTimeout(hideTimer.current);
    updatePos();
    setOpen(true);
  }, [updatePos]);

  const hide = useCallback(() => {
    if (pinned) return; // don't hide if pinned by click
    hideTimer.current = setTimeout(() => setOpen(false), 200);
  }, [pinned]);

  const keepOpen = useCallback(() => {
    clearTimeout(hideTimer.current);
  }, []);

  // Click handler: toggle pin
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (pinned) {
      setPinned(false);
      setOpen(false);
    } else {
      updatePos();
      setPinned(true);
      setOpen(true);
    }
  }, [pinned, updatePos]);

  // Close on click outside when pinned
  useEffect(() => {
    if (!pinned) return;
    function handleDocClick(e: MouseEvent) {
      if (
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setPinned(false);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [pinned]);

  // Close on scroll when not pinned
  useEffect(() => {
    if (!open || pinned) return;
    const close = () => {
      clearTimeout(hideTimer.current);
      setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, pinned]);

  // Update position when open
  useEffect(() => {
    if (!open) return;
    updatePos();
  }, [open, updatePos]);

  if (!def) return <>{children}</>;

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-flex"
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={handleClick}
      >
        {children}
      </div>

      {open && pos && typeof document !== "undefined" && createPortal(
        <>
          {/* Invisible bridge between trigger and tooltip */}
          <div
            className="fixed z-[9998]"
            style={{
              top: pos.top - 8,
              left: Math.min(pos.left, window.innerWidth - 340),
              width: 340,
              height: 16
            }}
            onMouseEnter={keepOpen}
            onMouseLeave={hide}
          />

          {/* Tooltip card */}
          <div
            ref={tooltipRef}
            className="fixed z-[9999] w-[300px] sm:w-[340px] rounded-lg border border-terminal-cyan/50 bg-[#091916] shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,200,180,0.08)] p-3.5"
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={keepOpen}
            onMouseLeave={hide}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-terminal-cyan">{def.term}</span>
                <span className="text-[11px] text-terminal-muted">{def.full}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setPinned(false); setOpen(false); }}
                className="text-terminal-muted/50 hover:text-white text-xs leading-none"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="space-y-2 text-xs leading-[1.55]">
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

            {/* Pinned indicator */}
            {pinned && (
              <div className="mt-2 pt-2 border-t border-terminal-edge text-[10px] text-terminal-muted/60 text-right">
                Klikoni kudo për ta mbyllur
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
