"use client";

import { useEffect, useRef } from "react";
import { useFinePointer, useMotionTier } from "@/lib/motion/capability";

const WORD = "OUTLIVED";

/**
 * OUTLIVED set enormous at the foot of every page. Desktop: each letter lifts
 * and tilts toward the cursor like a loose page. Phones: letters lift in a
 * wave as the footer scrolls into view.
 */
export function FooterWordmark() {
  const tier = useMotionTier();
  const fine = useFinePointer();
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || tier === "static") return;
    const letters = Array.from(el.querySelectorAll<HTMLSpanElement>("[data-letter]"));
    const state = letters.map(() => ({ y: 0, r: 0, ty: 0, tr: 0 }));
    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let visible = false;

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) raf = requestAnimationFrame(tick);
    });
    io.observe(el);

    const onMove = (e: PointerEvent) => (pointer = { x: e.clientX, y: e.clientY });
    const onLeave = () => (pointer = null);

    function tick() {
      const box = el!.getBoundingClientRect();
      const scrollP = Math.max(0, Math.min(1, (window.innerHeight - box.top) / (box.height + window.innerHeight * 0.4)));
      letters.forEach((l, i) => {
        const s = state[i];
        if (fine && pointer) {
          const r = l.getBoundingClientRect();
          const dx = pointer.x - (r.left + r.width / 2);
          const dy = pointer.y - (r.top + r.height / 2);
          const k = Math.max(0, 1 - Math.hypot(dx, dy) / 420);
          s.ty = -k * 34;
          s.tr = Math.max(-1, Math.min(1, dx / 420)) * k * 14;
        } else if (!fine) {
          const wave = Math.sin(scrollP * Math.PI * 2 - i * 0.55);
          s.ty = -Math.max(0, wave) * 22 * (1 - scrollP * 0.5);
          s.tr = wave * 4;
        } else {
          s.ty = 0;
          s.tr = 0;
        }
        s.y += (s.ty - s.y) * 0.12;
        s.r += (s.tr - s.r) * 0.12;
        l.style.transform = `translate3d(0, ${s.y.toFixed(2)}px, 0) rotate(${s.r.toFixed(2)}deg)`;
      });
      if (visible) raf = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [tier, fine]);

  return (
    <p
      ref={ref}
      aria-hidden="true"
      className="flex select-none justify-center overflow-hidden whitespace-nowrap pt-6 text-[21vw] font-extrabold uppercase leading-[0.74] tracking-[-0.06em]"
      style={{ color: "color-mix(in oklab, var(--bone) 13%, var(--ink))" }}
    >
      {[...WORD].map((ch, i) => (
        <span key={i} data-letter className="inline-block origin-bottom will-change-transform">
          {ch}
        </span>
      ))}
    </p>
  );
}
