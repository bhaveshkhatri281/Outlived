"use client";

import { gsap } from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { refreshScrollTriggerIfLoaded } from "@/lib/motion/gsap";
import { getLenis } from "@/lib/motion/lenis";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { playFold } from "@/lib/sound";
import { safeSession } from "@/lib/storage";

/** Once per visit: a new tab (or new visit) sees the gate; reloads and page changes in the same tab don't. */
export const GATE_KEY = "outlived:entered";
const LINE = "MOST THINGS DON'T LAST.";
const GLYPHS = "▓▒░#%&/\\|<>_=+*:;01";
const HOLD_MS = 1200; // holding to completion
const DRAIN_MS = 400; // early release drains back smoothly
const TYPE_MS = 600; // the line types in
const STILL_MS = 2500; // then stays fully readable
const ERODE_MS = 4000; // then erodes slowly...
const ERODE_MAX = 0.6; // ...never removing more than 60% of the characters
const HOLD_SLOWDOWN = 0.2; // holding preserves the line
const RING = 2 * Math.PI * 44;
const LETTERS = [...LINE].map((ch, i) => (ch === " " ? -1 : i)).filter((i) => i >= 0);

// Four triangles meeting at the centre; each folds back on its outer edge.
const PANELS = [
  { clip: "polygon(0 0, 100% 0, 50% 50%)", origin: "50% 0%", rx: -96, ry: 0 },
  { clip: "polygon(100% 0, 100% 100%, 50% 50%)", origin: "100% 50%", rx: 0, ry: -96 },
  { clip: "polygon(0 100%, 100% 100%, 50% 50%)", origin: "50% 100%", rx: 96, ry: 0 },
  { clip: "polygon(0 0, 0 100%, 50% 50%)", origin: "0% 50%", rx: 0, ry: 96 },
];

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
  const [chars, setChars] = useState<string[]>(() => [...LINE].map(() => " "));
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState(false);
  const holding = useRef(false);
  const progressRef = useRef(0);
  const drain = useRef<{ from: number; at: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const backingRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ctxRef = useRef<gsap.Context | null>(null);

  // Scroll stays locked while the gate is up.
  useEffect(() => {
    if (document.documentElement.dataset.gate !== "pending") return;
    setPhase("on");
    // The gate's own panels now cover the page, so drop the first-paint cover right away: the page
    // underneath gets painted while the gate is up, not in the middle of the fold.
    document.documentElement.dataset.gate = "up";
    document.documentElement.style.overflow = "hidden";
    getLenis()?.stop();
  }, []);

  useEffect(() => () => ctxRef.current?.revert(), []);

  /**
   * After the fold has fully finished, wait two frames, then do the heavy work in
   * order: start Lenis (and release the scroll lock), refresh ScrollTrigger, and
   * only then unmount the gate. Nothing heavy happens during the 0.9s fold.
   */
  const release = useCallback(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.documentElement.style.overflow = "";
        getLenis()?.start();
        refreshScrollTriggerIfLoaded();
        setPhase("off");
      }),
    );
  }, []);

  const open = useCallback(() => {
    if (phase !== "on") return;
    const prePromoted = holding.current; // a completed hold already promoted the panels
    holding.current = false;
    playFold();
    safeSession.setItem(GATE_KEY, "1");
    // Drop the first-paint cover (the panels still cover the page) and let the hero, already
    // mounted and compiled behind the gate, start its unfold.
    document.documentElement.dataset.gate = "open";
    window.dispatchEvent(new Event("outlived:gate-open"));
    setPhase("folding");

    ctxRef.current = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.to(rootRef.current, { opacity: 0, duration: 0.3, ease: "power1.out", onComplete: release });
        return;
      }
      const panels = panelRefs.current.filter((p): p is HTMLDivElement => !!p);
      gsap.set(panels, { willChange: "transform, opacity" }); // GPU layers only while animating
      gsap
        .timeline({
          // Skip (no hold): give the browser two frames to create the layers before motion starts.
          delay: prePromoted ? 0 : 0.034,
          onComplete: () => {
            gsap.set(panels, { willChange: "auto" });
            release();
          },
        })
        .set(backingRef.current, { autoAlpha: 0 }, 0)
        .to(contentRef.current, { opacity: 0, duration: 0.15, ease: "power1.out" }, 0)
        .to(panels, { rotationX: (i: number) => PANELS[i].rx, rotationY: (i: number) => PANELS[i].ry, duration: 0.9, ease: "power3.inOut", force3D: true }, 0)
        // The last 20%: fade out so the motion ends decisively instead of crawling.
        .to(panels, { opacity: 0, duration: 0.18, ease: "power1.in" }, 0.72);
    }, rootRef);
  }, [phase, release]);

  // One loop drives the line (type-in → still → slow erosion) and the hold progress.
  useEffect(() => {
    if (phase !== "on") return;
    btnRef.current?.focus({ preventScroll: true });
    const reduced = prefersReducedMotion();
    // A fixed random order in which letters erode, and when each one went.
    const order = [...LETTERS].sort(() => Math.random() - 0.5);
    const erodedAt = new Map<number, number>();
    const started = performance.now();
    let last = started;
    let erosion = 0; // 0..1 across ERODE_MS, slowed while holding
    let raf = 0;
    const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const t = now - started;

      // Hold fills over 1.2s; an early release drains back over ~400ms (ease-out), from wherever it was.
      let p: number;
      if (holding.current) {
        p = Math.min(1, progressRef.current + dt / HOLD_MS);
        drain.current = null;
      } else if (progressRef.current > 0) {
        drain.current ??= { from: progressRef.current, at: now };
        const k = Math.min(1, (now - drain.current.at) / DRAIN_MS);
        p = drain.current.from * (1 - (1 - (1 - k) * (1 - k)));
      } else {
        p = 0;
      }
      progressRef.current = p;
      setProgress(p);
      // Mirrored on the cursor ring. Set on the cursor element only: a custom property on <html>
      // would restyle the whole document every frame.
      document.querySelector<HTMLElement>(".cursor-layer")?.style.setProperty("--hold", p.toFixed(3));
      if (p >= 1) return open();

      if (reduced) {
        // Reduced motion: the line simply fades in (CSS) and never erodes.
        if (t < 32) setChars([...LINE]);
      } else {
        const typed = Math.min(LINE.length, Math.ceil((t / TYPE_MS) * LINE.length));
        if (t > TYPE_MS + STILL_MS) erosion = Math.min(1, erosion + (dt / ERODE_MS) * (holding.current ? HOLD_SLOWDOWN : 1));
        const target = Math.floor(erosion * ERODE_MAX * LETTERS.length);
        for (let k = erodedAt.size; k < target; k++) erodedAt.set(order[k], now);
        setChars(
          [...LINE].map((ch, i) => {
            if (i >= typed) return " ";
            const at = erodedAt.get(i);
            if (at === undefined) return ch;
            // A letter flickers into glyph noise for a moment, then mostly vanishes.
            if (now - at < 450) return Math.random() < 0.7 ? glyph() : ch;
            return Math.random() < 0.06 ? glyph() : " ";
          }),
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.querySelector<HTMLElement>(".cursor-layer")?.style.removeProperty("--hold");
    };
  }, [phase, open]);

  if (phase === "off") return null;

  // Promote the fold panels to GPU layers while a hold is in progress, so layer creation never
  // lands inside the fold itself; demote them again if the hold is abandoned.
  const promote = (on: boolean) => gsap.set(panelRefs.current.filter(Boolean), { willChange: on ? "transform, opacity" : "auto" });
  const start = () => {
    holding.current = true;
    setHint(false);
    promote(true);
  };
  const stop = () => {
    if (!holding.current) return;
    holding.current = false;
    promote(false);
    // Let go too early: the ring drains and a quiet hint explains what to do.
    if (progressRef.current > 0 && progressRef.current < 1) setHint(true);
  };
  const folding = phase === "folding";

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to OUTLIVED"
      className={`fixed inset-0 z-[200] [perspective:1600px] [transform-style:preserve-3d] ${folding ? "pointer-events-none" : ""}`}
    >
      {/* Solid backing so the hairline seams between the triangles never show the page while the gate is up. */}
      <div ref={backingRef} aria-hidden="true" className="absolute inset-0 bg-ink" />
      {/* Transforms and opacity here are driven only by GSAP (no React-controlled styles to fight it). */}
      {PANELS.map((p, i) => (
        <div
          key={i}
          ref={(el) => {
            panelRefs.current[i] = el;
          }}
          aria-hidden="true"
          className="absolute inset-0 bg-ink [backface-visibility:hidden]"
          style={{ clipPath: p.clip, transformOrigin: p.origin }}
        />
      ))}

      <div
        ref={contentRef}
        className="absolute inset-0 flex select-none flex-col items-center justify-center gap-14 px-6 [-webkit-touch-callout:none]"
      >
        <p className="mono text-center text-[15px] tracking-[0.3em] text-bone motion-safe:animate-none motion-reduce:animate-[toast-in_600ms_ease-out] md:text-[18px]">
          <span className="sr-only">{LINE}</span>
          <span aria-hidden="true" className="whitespace-pre">
            {chars.join("")}
          </span>
        </p>

        <div className="flex flex-col items-center gap-5">
        <button
          ref={btnRef}
          type="button"
          // Pointer events: mouse and touch share one path. Capture keeps the hold alive if a finger drifts.
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            start();
          }}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={stop}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              if (!e.repeat) start();
            }
          }}
          onKeyUp={(e) => (e.key === " " || e.key === "Enter") && stop()}
          onBlur={stop}
          onContextMenu={(e) => e.preventDefault()}
          data-cursor="hold"
          className="group relative grid h-28 w-28 touch-none select-none place-items-center rounded-full transition-transform duration-200 [-webkit-touch-callout:none] hover:scale-[1.04] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
          aria-label="Hold to enter"
          aria-describedby="gate-hint"
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="44" fill="none" strokeWidth="1.5" className="stroke-line transition-[stroke] duration-200 group-hover:stroke-bone" />
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
        <p id="gate-hint" className={`mono h-4 text-ash transition-opacity duration-300 ${hint ? "opacity-100" : "opacity-0"}`}>
          Keep holding
        </p>
        </div>
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
