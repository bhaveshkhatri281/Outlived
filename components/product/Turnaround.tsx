"use client";

import { gsap } from "gsap";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Hotspot } from "@/data/hotspots";
import { VIEWS, type Product } from "@/lib/commerce/types";
import { figureImage, imageSize, viewAlt } from "@/lib/images";
import { useFinePointer, useMotionTier } from "@/lib/motion/capability";
import { safeStorage } from "@/lib/storage";
import { markHeroReady } from "@/lib/transition/shared";

const HINT_KEY = "outlived-hint-turn";
const LOUPE = 190; // lens diameter, px
const ZOOM = 2.5;

const mod3 = (n: number) => ((Math.round(n) % 3) + 3) % 3;

/**
 * The Exhibit viewer: drag (or swipe) to turn the piece with inertia, snapping
 * to front / side / back. Construction hotspots appear on a settled view; on
 * desktop a 2.5× fabric loupe follows the cursor.
 */
export function Turnaround({ product: p, hotspots }: { product: Product; hotspots: Hotspot[] }) {
  const tier = useMotionTier();
  const fine = useFinePointer();
  const { width, height } = imageSize(p.slug);
  const figures = VIEWS.map((v) => figureImage(p, v));

  const stageRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const frontImg = useRef<HTMLImageElement>(null);
  const loupeRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ v: 0 });
  const tween = useRef<gsap.core.Tween | null>(null);
  const drag = useRef<{ x: number; v: number; lastX: number; lastT: number; vel: number; moved: boolean; id: number } | null>(null);

  const [snap, setSnap] = useState(0);
  const [moving, setMoving] = useState(false);
  const [hint, setHint] = useState(false);
  // Open hotspot. Hover / focus open it loosely; a click or tap pins it (so the click that follows
  // hover or a tap's focus never closes it again), and only a second click unpins and closes it.
  const [open, setOpen] = useState<{ i: number; pinned: boolean } | null>(null);

  const render = useCallback(() => {
    const v = pos.current.v;
    layers.current.forEach((el, i) => {
      if (!el) return;
      const d = ((((v - i) % 3) + 4.5) % 3) - 1.5; // signed distance in views, [-1.5, 1.5)
      const a = Math.min(Math.abs(d), 1);
      el.style.opacity = String(1 - a);
      el.style.zIndex = String(10 - Math.round(a * 9));
      el.style.transform = tier === "static" ? "" : `perspective(1600px) rotateY(${d * -34}deg) scaleX(${1 - a * 0.1})`;
    });
  }, [tier]);

  useEffect(() => {
    render();
    markHeroReady(frontImg.current);
    if (!safeStorage.getItem(HINT_KEY)) setHint(true);
  }, [render]);

  const settle = useCallback(
    (target: number) => {
      tween.current?.kill();
      setMoving(true);
      setOpen(null);
      tween.current = gsap.to(pos.current, {
        v: target,
        duration: tier === "static" ? 0 : 0.8,
        ease: "power3.out",
        onUpdate: render,
        onComplete: () => {
          setSnap(mod3(target));
          setMoving(false);
        },
      });
    },
    [render, tier],
  );

  const goTo = (i: number) => {
    const delta = ((i - snap + 4) % 3) - 1; // shortest way round: -1, 0 or 1
    settle(Math.round(pos.current.v) + delta);
  };

  const dismissHint = () => {
    if (!hint) return;
    setHint(false);
    safeStorage.setItem(HINT_KEY, "1");
  };

  // ── Drag with inertia ────────────────────────────────────────────────
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as Element).closest("[data-hotspot]")) return;
    tween.current?.kill();
    drag.current = { x: e.clientX, v: pos.current.v, lastX: e.clientX, lastT: performance.now(), vel: 0, moved: false, id: e.pointerId };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      const dx = e.clientX - d.x;
      if (!d.moved && Math.abs(dx) > 5) {
        d.moved = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setMoving(true);
        setOpen(null);
        dismissHint();
        hideLoupe();
      }
      if (d.moved) {
        const w = stageRef.current!.clientWidth;
        const now = performance.now();
        d.vel = (e.clientX - d.lastX) / Math.max(1, now - d.lastT);
        d.lastX = e.clientX;
        d.lastT = now;
        pos.current.v = d.v - dx / (w * 0.7);
        render();
      }
      return;
    }
    moveLoupe(e);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    const w = stageRef.current!.clientWidth;
    const fling = (-d.vel * 1000) / (w * 0.7); // views per second
    // One drag turns at most one view from where it started (a long drag plus a fling used to skip one).
    const base = Math.round(d.v);
    const target = Math.round(pos.current.v + fling * 0.22);
    settle(Math.max(base - 1, Math.min(base + 1, target)));
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      dismissHint();
      settle(Math.round(pos.current.v) + (e.key === "ArrowRight" ? 1 : -1));
    }
  };

  // ── Fabric loupe (desktop) ───────────────────────────────────────────
  const loupeOn = fine && tier !== "static";
  const hideLoupe = () => {
    if (loupeRef.current) loupeRef.current.style.opacity = "0";
    stageRef.current?.setAttribute("data-cursor", "drag");
  };
  const moveLoupe = (e: PointerEvent<HTMLDivElement>) => {
    if (!loupeOn || e.pointerType !== "mouse" || !boxRef.current || !loupeRef.current) return;
    if ((e.target as Element).closest("[data-hotspot]") || moving) return hideLoupe();
    const box = boxRef.current.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    if (x < 0 || y < 0 || x > box.width || y > box.height) return hideLoupe();
    const lens = loupeRef.current;
    const src = figures[snap].src;
    lens.style.opacity = "1";
    lens.style.transform = `translate3d(${x - LOUPE / 2}px, ${y - LOUPE / 2}px, 0)`;
    lens.style.backgroundImage = `url(${src})`;
    lens.style.backgroundSize = `${box.width * ZOOM}px ${box.height * ZOOM}px`;
    lens.style.backgroundPosition = `${-(x * ZOOM - LOUPE / 2)}px ${-(y * ZOOM - LOUPE / 2)}px`;
    stageRef.current?.setAttribute("data-cursor", "none");
  };

  const visibleSpots = moving ? [] : hotspots.filter((h) => h.view === VIEWS[snap]);

  return (
    <div className="relative">
      <div
        ref={stageRef}
        role="group"
        aria-roledescription="turnaround viewer"
        aria-label={`${p.name}, ${VIEWS[snap]} view. Use the left and right arrow keys to turn it.`}
        tabIndex={0}
        data-cursor="drag"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={hideLoupe}
        onKeyDown={onKeyDown}
        className="relative mx-auto touch-pan-y select-none outline-offset-8"
      >
        {/* The light: a soft pool behind head and shoulders. */}
        <div aria-hidden="true" className="figure-light -inset-x-[30%] -top-[8%] bottom-0 -z-10" />
        <div
          className="relative mx-auto max-h-[72svh] md:max-h-[calc(100svh-var(--header-h)-120px)]"
          style={{ aspectRatio: `${width} / ${height}`, height: "min(1200px, 100svh)" }}
        >
        <div aria-hidden="true" className="figure-ground" />
        <div ref={boxRef} className="absolute inset-0">
          {VIEWS.map((v, i) => (
            <div
              key={v}
              ref={(el) => {
                layers.current[i] = el;
              }}
              data-vt-hero={i === 0 ? "" : undefined}
              className={`${figures[i].mask} absolute inset-0 will-change-transform`}
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              <Image
                ref={i === 0 ? frontImg : undefined}
                src={figures[i].src}
                alt={viewAlt(p, v)}
                width={width}
                height={height}
                sizes="(min-width: 768px) 440px, 80vw"
                // Front view: eager, but no <link rel=preload> (next/image priority; React 19 adds one too for
                // any eager <img> unless fetchPriority is "low"). Coming from a Vault card, the browser already
                // holds a larger copy and picks it from srcset, so the preload was wasted (console warning).
                // The <img> is in the server HTML and Chrome raises in-viewport images after layout.
                loading={i === 0 ? "eager" : undefined}
                fetchPriority={i === 0 ? "low" : undefined}
                draggable={false}
                className="h-full w-full object-cover"
              />
            </div>
          ))}

          {visibleSpots.map((h, i) => {
            const isOpen = open?.i === i;
            const flip = h.x > 58;
            return (
              <div key={`${h.view}-${i}`} className="absolute z-20" style={{ left: `${h.x}%`, top: `${h.y}%` }} data-hotspot>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={`Construction detail: ${h.title}`}
                  onClick={() => setOpen(isOpen && open.pinned ? null : { i, pinned: true })}
                  onMouseEnter={() => setOpen((o) => (o?.i === i ? o : { i, pinned: false }))}
                  onMouseLeave={() => setOpen((o) => (o?.i === i && !o.pinned ? null : o))}
                  onFocus={() => setOpen((o) => (o?.i === i ? o : { i, pinned: false }))}
                  onBlur={() => setOpen((o) => (o?.i === i ? null : o))}
                  className="relative -ml-5 -mt-5 grid h-10 w-10 place-items-center motion-safe:animate-[toast-in_400ms_var(--ease-reveal)]"
                >
                  <span className="hotspot-ring absolute h-3 w-3 rounded-full border border-rust" aria-hidden="true" />
                  <span className="h-3 w-3 rounded-full bg-rust ring-2 ring-ink/60" aria-hidden="true" />
                </button>
                {isOpen && (
                  <div
                    role="note"
                    className={`absolute top-1/2 w-56 -translate-y-1/2 border border-line bg-ink/95 px-4 py-3 backdrop-blur-sm ${flip ? "right-7" : "left-7"}`}
                  >
                    <p className="mono text-bone">
                      <span className="mr-2 text-ash">{String(i + 1).padStart(2, "0")}</span>
                      {h.title}
                    </p>
                    <p className="mt-1.5 text-[14px] leading-snug text-bone">{h.text}</p>
                  </div>
                )}
              </div>
            );
          })}

          {loupeOn && (
            <div
              ref={loupeRef}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-30 rounded-full border border-bone/70 bg-ink bg-no-repeat opacity-0 transition-opacity duration-150"
              style={{ width: LOUPE, height: LOUPE }}
            >
              <span className="mono absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-bone">2.5× · drag</span>
            </div>
          )}
        </div>
        </div>

        {hint && (
          <p
            aria-hidden="true"
            className="mono pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap border border-line bg-ink/80 px-4 py-2 text-bone backdrop-blur-sm"
          >
            ← drag to turn →
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2" role="tablist" aria-label="Views">
        {VIEWS.map((v, i) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={snap === i}
            onClick={() => goTo(i)}
            className={`mono flex h-11 items-center gap-2 border px-4 transition-colors duration-150 ${
              snap === i ? "border-bone text-bone" : "border-line text-ash hover:text-bone"
            }`}
          >
            <span className="text-ash">{String(i + 1).padStart(2, "0")}</span>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
