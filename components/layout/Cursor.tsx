"use client";

import { useEffect, useRef } from "react";
import { useFinePointer, useMotionTier } from "@/lib/motion/capability";

/**
 * Desktop-only cursor: a bone dot that grows into a labelled ring over
 * `[data-cursor="view" | "drag"]`, and hides over `[data-cursor="none"]`
 * (e.g. where the fabric loupe takes over). Native cursor returns on text fields.
 */
export function Cursor() {
  const fine = useFinePointer();
  const tier = useMotionTier();
  const enabled = fine && tier !== "static";
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const label = labelRef.current!;
    let x = -100, y = -100, rx = x, ry = y;
    let mode = "";
    let raf = 0;
    let live = false;

    const setMode = (next: string) => {
      if (next === mode) return;
      mode = next;
      ring.dataset.mode = next;
      dot.dataset.mode = next;
      label.textContent = next === "view" ? "View" : next === "drag" ? "Drag" : next === "hold" ? "Hold" : "";
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      // Hide the system cursor only once ours is on screen at a real position: never no cursor.
      if (!live) {
        live = true;
        rx = x;
        ry = y;
        root.classList.add("has-cursor");
      }
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const t = (e.target as Element | null)?.closest?.("[data-cursor], a, button, [role=button], input, select, textarea, label");
      const attr = t?.getAttribute("data-cursor");
      setMode(attr ?? (t ? "link" : ""));
    };
    const onLeave = () => setMode("hidden");
    const tick = () => {
      rx += (x - rx) * 0.22;
      ry += (y - ry) * 0.22;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div aria-hidden="true" className="cursor-layer">
      <div ref={ringRef} className="cursor-ring">
        {/* Mirrors the entry gate's hold progress (CSS variable --hold on <html>). */}
        <svg className="cursor-hold" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="35" />
        </svg>
        <span ref={labelRef} className="cursor-label" />
      </div>
      <div ref={dotRef} className="cursor-dot" />
    </div>
  );
}
