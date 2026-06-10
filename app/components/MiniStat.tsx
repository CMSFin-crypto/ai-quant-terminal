"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { getMetricDef } from "@/lib/metricDefs";

export function MiniStat({ label, value }: { label: string; value: string }) {
  const [showInfo, setShowInfo] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const def = getMetricDef(label);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updatePos = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({
        top: rect.top - 10,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 360))
      });
    }
  }, []);

  const show = useCallback(() => {
    if (!def) return;
    clearTimeout(hideTimer.current);
    updatePos();
    setShowInfo(true);
  }, [def, updatePos]);

  const hide = useCallback(() => {
    if (pinned) return;
    hideTimer.current = setTimeout(() => setShowInfo(false), 200);
  }, [pinned]);

  const keepOpen = useCallback(() => {
    clearTimeout(hideTimer.current);
  }, []);

  const handleLabelClick = useCallback((e: React.MouseEvent) => {
    if (!def) return;
    e.stopPropagation();
    if (pinned) {
      setPinned(false);
      setShowInfo(false);
    } else {
      updatePos();
      setPinned(true);
      setShowInfo(true);
    }
  }, [def, pinned, updatePos]);

  // Close on click outside when pinned
  useEffect(() => {
    if (!pinned) return;
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node) &&
          ref.current && !ref.current.contains(e.target as Node)) {
        setPinned(false);
        setShowInfo(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pinned]);

  // Close on scroll / resize when not pinned
  useEffect(() => {
    if (!showInfo || pinned) return;
    const close = () => {
      clearTimeout(hideTimer.current);
      setShowInfo(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [showInfo, pinned]);

  // Update position when shown
  useEffect(() => {
    if (!showInfo) return;
    updatePos();
  }, [showInfo, updatePos]);

  return (
    <>
      <div
        ref={ref}
        className="rounded border border-terminal-edge bg-black/20 p-1.5 sm:p-2"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <button
          onClick={handleLabelClick}
          className={`text-[9px] sm:text-[10px] uppercase tracking-[0.10em] sm:tracking-[0.12em] ${
            def ? "text-terminal-cyan cursor-pointer hover:text-terminal-cyan/80" : "text-terminal-muted"
          } flex items-center gap-1`}
          title={def ? `Klikoni ose hover për info rreth ${label}` : undefined}
        >
          {label}
          {def && <span className="text-[8px] opacity-50">ⓘ</span>}
        </button>
        <div className="mt-0.5 sm:mt-1 truncate text-xs sm:text-sm font-semibold text-white">{value}</div>
      </div>

      {/* Portal popup - renders outside any overflow:hidden parent */}
      {showInfo && def && pos && typeof document !== "undefined" && createPortal(
        <>
          {/* Bridge for mouse movement */}
          <div
            className="fixed z-[9998]"
            style={{
              top: pos.top - 10,
              left: Math.min(pos.left, window.innerWidth - 340),
              width: 340,
              height: 16
            }}
            onMouseEnter={keepOpen}
            onMouseLeave={hide}
          />

          <div
            ref={popupRef}
            className="fixed z-[9999] w-[300px] sm:w-[340px] rounded-lg border border-terminal-cyan/50 bg-[#091916] shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,200,180,0.08)] p-3.5"
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translateY(-100%)"
            }}
            onMouseEnter={keepOpen}
            onMouseLeave={hide}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div>
                <span className="text-sm font-bold text-terminal-cyan">{def.term}</span>
                <span className="ml-2 text-[11px] text-terminal-muted">{def.full}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setPinned(false); setShowInfo(false); }}
                className="text-terminal-muted/50 hover:text-white text-xs leading-none"
              >
                ✕
              </button>
            </div>
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
