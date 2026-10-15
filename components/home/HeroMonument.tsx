"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { MonoLabel, placard } from "@/components/ui/MonoLabel";
import { formatINR } from "@/lib/commerce/format";
import { VIEWS, type Product } from "@/lib/commerce/types";
import { figureImage, imageSize, viewAlt } from "@/lib/images";
import { downgradeTier, useFinePointer, useMotionTier } from "@/lib/motion/capability";

const MonumentScene = dynamic(() => import("./MonumentScene"), { ssr: false });

/**
 * Hero: "The Monument". First paint is plain HTML (figure, giant type,
 * placard, CTA). On capable devices the WebGL scene mounts at idle time,
 * unfolds the garment, and turns it front → side → back while pinned.
 * Lite devices get a CSS crossfade; reduced motion gets a still image.
 */
export function HeroMonument({ product: p }: { product: Product }) {
  const tier = useMotionTier();
  const fine = useFinePointer();
  const { width, height } = imageSize(p.slug);
  const figures = VIEWS.map((v) => figureImage(p, v));

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLParagraphElement>(null);
  const coneRef = useRef<HTMLDivElement>(null);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });

  const [mountGL, setMountGL] = useState(false);
  const [glReady, setGlReady] = useState(false);
  const [inView, setInView] = useState(true);
  const [view, setView] = useState(0);
  const [waitForGate] = useState(() => typeof document !== "undefined" && ["pending", "up"].includes(document.documentElement.dataset.gate ?? ""));

  const pinned = tier !== "static";
  const useGL = tier === "full" && mountGL;

  // Mount WebGL on the first sign of a person (pointer, scroll, key, touch, or the entry ritual)
  // or, with a mouse, after ~3.5s idle, so the three.js download never competes with first paint and
  // interactivity. Touch phones skip the idle timer: ~900 KB of 3D is only fetched once someone
  // actually touches or scrolls, never for a visit that bounces (the CSS crossfade covers until then).
  useEffect(() => {
    if (tier !== "full") return;
    const events = ["pointermove", "pointerdown", "wheel", "touchstart", "keydown", "scroll"] as const;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      cleanup();
      setMountGL(true);
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const timer = fine ? setTimeout(() => (w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 1500 }) : go()), 3500) : undefined;
    events.forEach((e) => window.addEventListener(e, go, { passive: true, once: true }));
    // Behind the entry gate: mount (and compile) right away, so nothing initialises when the gate opens.
    if (["pending", "up"].includes(document.documentElement.dataset.gate ?? "")) go();
    function cleanup() {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, go));
    }
    return cleanup;
  }, [tier, fine]);

  // Pause rendering when the hero is off screen.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scroll → turn progress (0 front, 1 side, 2 back). Lite devices crossfade the DOM layers.
  useEffect(() => {
    if (!pinned) return;
    const onScroll = () => {
      const s = sectionRef.current;
      if (!s) return;
      const pin = s.offsetHeight - window.innerHeight;
      const prog = Math.max(0, Math.min(1, -s.getBoundingClientRect().top / Math.max(1, pin))) * 2;
      progress.current = prog;
      const v = Math.round(prog);
      setView((prev) => (prev === v ? prev : v));
      if (tier === "lite") {
        layers.current.forEach((el, i) => {
          if (!el) return;
          const d = Math.min(1, Math.abs(prog - i));
          el.style.opacity = String(1 - d);
          el.style.transform = `scale(${1 + d * 0.03})`;
        });
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pinned, tier]);

  // Pointer parallax: type, light and figure move at different depths (≤ 12px).
  useEffect(() => {
    if (!fine || tier === "static") return;
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    let raf = 0;
    const tick = () => {
      const pt = pointer.current;
      pt.x += (target.x - pt.x) * 0.06;
      pt.y += (target.y - pt.y) * 0.06;
      if (typeRef.current) typeRef.current.style.transform = `translate3d(${-pt.x * 12}px, calc(-50% + ${-pt.y * 8}px), 0)`;
      if (coneRef.current) coneRef.current.style.transform = `translate3d(${pt.x * 10}px, ${pt.y * 4}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [fine, tier]);

  const onReady = useCallback(() => setTimeout(() => setGlReady(true), 360), []);
  const onSlow = useCallback(() => downgradeTier("lite"), []);

  const hideDom = useGL && glReady;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="relative -mt-[var(--header-h)] [--pin:70vh] md:[--pin:120vh]"
      style={{ height: pinned ? "calc(100svh + var(--pin))" : "100svh" }}
    >
      <div ref={stageRef} className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Back to front: light cone → OUTLIVED → figure (fully opaque) → dust (WebGL) → UI. */}
        <div
          ref={coneRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 24% 82% at 50% 0%, color-mix(in oklab, var(--bone) 11%, transparent), transparent 78%)" }}
        />
        <p
          ref={typeRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[48%] -translate-y-1/2 select-none whitespace-nowrap text-center text-[29vw] font-extrabold uppercase leading-[0.8] tracking-[-0.075em] md:top-[57%] md:text-[27vw]"
          style={{ color: "color-mix(in oklab, var(--bone) 21%, var(--ink))" }}
        >
          Outlived
        </p>

        <div
          ref={figureRef}
          className="absolute left-1/2 top-[9svh] h-[70svh] -translate-x-1/2 md:top-[8svh] md:h-[92svh]"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          {/* Light behind head and shoulders, ground shadow under the fade. Both stay visible under the WebGL plane. */}
          <div aria-hidden="true" className="figure-light -inset-x-[45%] -top-[12%] bottom-0" />
          <div aria-hidden="true" className="figure-ground" />
          {VIEWS.map((v, i) => (
            <div
              key={v}
              ref={(el) => {
                layers.current[i] = el;
              }}
              className={`${figures[i].mask} absolute inset-0 will-change-[opacity]`}
              style={{ opacity: i === 0 ? 1 : 0, visibility: hideDom ? "hidden" : "visible" }}
            >
              <Image
                src={figures[i].src}
                alt={i === 0 ? viewAlt(p, v) : ""}
                width={width}
                height={height}
                priority={i === 0}
                fetchPriority={i === 0 ? "high" : "low"}
                loading={i === 0 ? undefined : tier === "lite" ? "eager" : "lazy"}
                sizes="(min-width: 768px) 50vh, 40vh"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        {useGL && (
          <div className="absolute inset-0">
            <MonumentScene
              textures={[figures[0].src, figures[1].src, figures[2].src]}
              cutout={figures.every((f) => f.cut)}
              stageRef={stageRef}
              figureRef={figureRef}
              progress={progress}
              pointer={pointer}
              waitForGate={waitForGate}
              active={inView}
              onReady={onReady}
              onSlow={onSlow}
            />
          </div>
        )}

        {/* What this is, on first paint. */}
        <div className="gutter absolute inset-x-0 top-[calc(var(--header-h)+28px)] hidden md:block">
          <MonoLabel as="p">Era 01 — The Fold · Now recovered</MonoLabel>
        </div>

        <div className="gutter absolute inset-x-0 bottom-0 grid gap-4 pb-5 md:grid-cols-3 md:items-end md:pb-8">
          <div>
            <h1 id="hero-title" className="mb-3 max-w-[20rem] text-[17px] font-semibold leading-tight md:text-[22px]">
              Hoodies, shackets and jackets built on folds.
            </h1>
            <MonoLabel as="p" tone="bone">
              {placard(p.code, p.name, formatINR(p.price))}
            </MonoLabel>
            <Link href={`/vault/${p.slug}`} className="mono mt-2 inline-block text-ash underline decoration-line underline-offset-4 hover:text-bone">
              View this piece
            </Link>
          </div>

          {pinned && (
            <div className="hidden justify-self-center text-center md:block" aria-hidden="true">
              <p className="mono flex gap-4">
                {VIEWS.map((v, i) => (
                  <span key={v} className={view === i ? "text-bone" : "text-ash"}>
                    {String(i + 1).padStart(2, "0")} {v}
                  </span>
                ))}
              </p>
              <p className="mono mt-2 text-ash">Scroll to turn ↓</p>
            </div>
          )}

          <ButtonLink href="/vault" className="w-full md:w-auto md:justify-self-end">
            Enter the Vault →
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
