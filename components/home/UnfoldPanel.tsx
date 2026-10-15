"use client";

import { useEffect, useRef, useState } from "react";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { useMotionTier } from "@/lib/motion/capability";
import { useGsap } from "@/lib/motion/useGsap";

const STRIPS = 5;
// Close-up of Soft Tessellation's folds (built by scripts/make-editorial.ts).
const SRC = "/editorial/unfold-tessellation.webp";
const ASPECT = 2160 / 1328;

/**
 * The Unfold: a full-width close-up of the folds that starts creased into 5
 * horizontal strips (alternating rotateX ±60°, the inward strips shaded darker)
 * and flattens as you scroll, scrubbed over ~80vh (~60vh on phones).
 */
export function UnfoldPanel() {
  const tier = useMotionTier();
  const ref = useRef<HTMLDivElement>(null);
  // Lazy: the 2160px close-up only loads when the panel is within a screen of the viewport.
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGsap(
    ref,
    ({ gsap }, el) => {
      const strips = gsap.utils.toArray<HTMLElement>("[data-fold]", el);
      const shades = gsap.utils.toArray<HTMLElement>("[data-fold-shade]", el);
      const distance = () => window.innerHeight * (window.innerWidth < 768 ? 0.6 : 0.8);
      const st = { trigger: el, start: "top 85%", end: () => `+=${distance()}`, scrub: 0.6, invalidateOnRefresh: true };
      gsap.fromTo(strips, { rotateX: (i: number) => (i % 2 ? -60 : 60) }, { rotateX: 0, ease: "none", scrollTrigger: st });
      // Inward-facing strips (odd) start much darker, like the shadow side of a crease.
      gsap.fromTo(shades, { opacity: (i: number) => (i % 2 ? 0.72 : 0.22) }, { opacity: 0, ease: "none", scrollTrigger: st });
    },
    [],
    tier !== "static",
  );

  return (
    <section aria-labelledby="unfold-title" className="py-24 md:py-40">
      <div ref={ref} className="relative w-full [perspective:1600px]" style={{ aspectRatio: ASPECT }}>
        {Array.from({ length: STRIPS }).map((_, i) => (
          <div
            key={i}
            data-fold
            className="absolute inset-x-0 overflow-hidden will-change-transform"
            style={{
              top: `${(i / STRIPS) * 100}%`,
              height: `calc(${100 / STRIPS}% + 1px)`, // 1px overlap hides sub-pixel seams
              transformOrigin: i % 2 ? "50% 0%" : "50% 100%",
              backgroundImage: near ? `url(${SRC})` : undefined,
              backgroundSize: "100% auto",
              backgroundPosition: `0 ${(i / (STRIPS - 1)) * 100}%`,
            }}
          >
            <div data-fold-shade className="absolute inset-0 bg-ink opacity-0" />
          </div>
        ))}
        {/* Soft edges so the close-up melts into the page. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 75% 85% at 50% 50%, transparent 60%, var(--ink) 100%)" }}
        />
        <span role="img" aria-label="Close-up of Soft Tessellation: triangle tucks folding the fleece into a diamond relief." className="sr-only" />
      </div>
      <div className="gutter mt-10 grid gap-6 md:grid-cols-12">
        <MonoLabel as="p" className="md:col-span-3">
          Fig. 01 · Soft Tessellation · OTL-D07-13
        </MonoLabel>
        <h2 id="unfold-title" className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] md:col-span-7 md:text-[44px]">
          Every OUTLIVED piece begins as a flat sheet. <em className="font-serif font-normal">The folds are the design.</em>
        </h2>
      </div>
    </section>
  );
}
