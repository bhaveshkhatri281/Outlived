"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLenis } from "@/lib/motion/lenis";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { playFold } from "@/lib/sound";
import { safeStorage } from "@/lib/storage";

export const GATE_KEY = "outlived-entered";
const LINE = "MOST THINGS DON'T LAST.";
const GLYPHS = "▓▒░#%&/\\|<>_=+*:;01";
const HOLD_MS = 1200;
const RING = 2 * Math.PI * 44;

/**
 * Entry ritual (first visit only, always skippable). The line erodes into
 * glyph noise; holding the button fills a rust ring over 1.2s and slows the
 * erosion, as if you're preserving it. Then the screen folds away like
 * origami: four triangular panels hinge back on their outer edges.
 *
 * The inline script in <head> sets html[data-gate="pending"] for first-time
 * human visitors, so the page is covered from the first paint.
 */
export function EntryGate() {
  const [phase, setPhase] = useState<"off" | "on" | "folding">("off");
  const [chars, setChars] = useState<string[]>(() => [...LINE]);
  const [progress, setProgress] = useState(0);
  const holding = useRef(false);
  const progressRef = useRef(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (document.documentElement.dataset.gate === "pending") {
      setPhase("on");
      getLenis()?.stop();
    }
  }, []);

  const finish = useCallback(() => {
    getLenis()?.start();
    setPhase("off");
  }, []);

  const open = useCallback(() => {
    if (phase !== "on") return;
    playFold();
    safeStorage.setItem(GATE_KEY, "1");
    // Drop the first-paint cover and start the hero's unfold while the panels fold away.
    document.documentElement.dataset.gate = "open";
    window.dispatchEvent(new Event("outlived:gate-open"));
    if (prefersReducedMotion()) return finish();
    setPhase("folding");
    setTimeout(finish, 1000);
  }, [phase, finish]);

  // Erosion + hold progress share one animation loop.
  useEffect(() => {
    if (phase !== "on") return;
    btnRef.current?.focus({ preventScroll: true });
    const eroded = new Set<number>();
    const started = performance.now();
    let last = started;
    let raf = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      // Hold fills over 1.2s; releasing drains it twice as fast.
      const p = Math.max(0, Math.min(1, progressRef.current + (holding.current ? dt / HOLD_MS : -dt / (HOLD_MS / 2))));
      progressRef.current = p;
      setProgress(p);
      if (p >= 1) return open();

      // Erosion slows while you hold; ~40% of the line always survives.
      const rate = (holding.current ? 0.15 : 1) * 0.0009 * dt;
      const reduced = prefersReducedMotion();
      setChars(
        [...LINE].map((ch, i) => {
          if (ch === " ") return " ";
          if (!reduced && eroded.size < LINE.length * 0.6 && Math.random() < rate && now - started > 900) eroded.add(i);
          if (eroded.has(i)) return Math.random() < 0.82 ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          if (!reduced && Math.random() < (holding.current ? 0.004 : 0.03)) return GLYPHS[(Math.random() * GLYPHS.length) | 0];
          return ch;
        }),
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, open]);

  if (phase === "off") return null;

  const start = () => (holding.current = true);
  const stop = () => (holding.current = false);
  const folding = phase === "folding";

  // Four triangles meeting at the centre; each folds back on its outer edge.
  const panels = [
    { clip: "polygon(0 0, 100% 0, 50% 50%)", origin: "50% 0%", to: "rotateX(-96deg)" },
    { clip: "polygon(100% 0, 100% 100%, 50% 50%)", origin: "100% 50%", to: "rotateY(-96deg)" },
    { clip: "polygon(0 100%, 100% 100%, 50% 50%)", origin: "50% 100%", to: "rotateX(96deg)" },
    { clip: "polygon(0 0, 0 100%, 50% 50%)", origin: "0% 50%", to: "rotateY(96deg)" },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome to OUTLIVED" className="fixed inset-0 z-[200] [perspective:1600px]">
      {panels.map((p, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute inset-0 bg-ink"
          style={{
            clipPath: p.clip,
            transformOrigin: p.origin,
            transform: folding ? p.to : "none",
            transition: `transform 900ms var(--ease-fold) ${i * 40}ms, filter 900ms var(--ease-fold) ${i * 40}ms`,
            filter: folding ? "brightness(2.2)" : "none",
          }}
        />
      ))}

      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-14 px-6 transition-opacity duration-200 ${folding ? "opacity-0" : "opacity-100"}`}>
        <p className="mono text-center text-[15px] tracking-[0.3em] text-bone md:text-[18px]">
          <span className="sr-only">{LINE}</span>
          <span aria-hidden="true" className="whitespace-pre">
            {chars.join("")}
          </span>
        </p>

        <button
          ref={btnRef}
          type="button"
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              start();
            }
          }}
          onKeyUp={stop}
          onContextMenu={(e) => e.preventDefault()}
          className="relative grid h-28 w-28 touch-none select-none place-items-center rounded-full"
          aria-label="Hold to enter"
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--line)" strokeWidth="1.5" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="var(--rust)"
              strokeWidth="3"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - progress)}
            />
          </svg>
          <span className="mono text-center text-[10px] leading-tight text-bone">
            Hold
            <br />
            to enter
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={open}
        className={`mono absolute right-[var(--gutter)] top-5 px-2 py-2 text-bone underline decoration-line underline-offset-4 transition-opacity hover:decoration-rust ${folding ? "opacity-0" : ""}`}
      >
        Skip
      </button>
    </div>
  );
}
