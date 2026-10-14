"use client";

import { useRef } from "react";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { useMotionTier } from "@/lib/motion/capability";
import { useGsap } from "@/lib/motion/useGsap";

const STRIPS = 5;
const SRC = "/editorial/unfold-soft-tessellation.webp";
const ASPECT = 1560 / 697;

/**
 * The Unfold: a full-width panorama that starts folded into 5 horizontal
 * strips (alternating rotateX, shaded along the creases) and unfolds flat,
 * scrubbed by scroll. Short and buttery: it's done by the time it's centred.
 */
export function UnfoldPanel() {
  const tier = useMotionTier();
  const ref = useRef<HTMLDivElement>(null);

  useGsap(
    ref,
    ({ gsap }, el) => {
      const strips = gsap.utils.toArray<HTMLElement>("[data-fold]", el);
      const shades = gsap.utils.toArray<HTMLElement>("[data-fold-shade]", el);
      const st = { trigger: el, start: "top 88%", end: "center 55%", scrub: 0.8 };
      gsap.fromTo(
        strips,
        { rotateX: (i: number) => (i % 2 ? -72 : 72), scaleY: 0.86 },
        { rotateX: 0, scaleY: 1, ease: "expo.out", scrollTrigger: st },
      );
      gsap.fromTo(shades, { opacity: (i: number) => (i % 2 ? 0.75 : 0.35) }, { opacity: 0, ease: "power2.out", scrollTrigger: st });
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
              backgroundImage: `url(${SRC})`,
              backgroundSize: "100% auto",
              backgroundPosition: `0 ${(i / (STRIPS - 1)) * 100}%`,
            }}
          >
            <div data-fold-shade className="absolute inset-0 bg-ink opacity-0" />
          </div>
        ))}
        {/* Soft edges so the panorama melts into the page. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 80% at 50% 50%, transparent 55%, var(--ink) 100%)" }}
        />
        <span role="img" aria-label="Soft Tessellation shown front, side and back: the triangle tucks that fold the fleece." className="sr-only" />
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
