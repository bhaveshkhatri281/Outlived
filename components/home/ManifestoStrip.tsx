"use client";

import { useRef } from "react";
import { useMotionTier } from "@/lib/motion/capability";
import { getLenis } from "@/lib/motion/lenis";
import { useGsap } from "@/lib/motion/useGsap";

const LINES = [
  { text: "Trends die in a season.", align: "md:text-left" },
  { text: "We make what’s left behind.", align: "md:text-right" },
  { text: "Built to outlive.", align: "md:text-center", serif: true },
];

/**
 * Three full-screen statements. Lines rise out of a mask as they enter;
 * scroll velocity stretches the letters vertically (≤ 1.15) and they spring back.
 */
export function ManifestoStrip() {
  const tier = useMotionTier();
  const ref = useRef<HTMLElement>(null);

  useGsap(
    ref,
    ({ gsap, ScrollTrigger }, el) => {
      let split: { revert: () => void } | undefined;
      let tickerFn: (() => void) | undefined;
      let cancelled = false;
      import("gsap/SplitText").then(({ SplitText }) => {
        if (cancelled) return;
        gsap.registerPlugin(SplitText);
        const statements = gsap.utils.toArray<HTMLElement>("[data-statement]", el);
        const splits = statements.map((s) => SplitText.create(s, { type: "lines", mask: "lines", linesClass: "manifesto-line" }));
        split = { revert: () => splits.forEach((sp) => sp.revert()) };
        // Statements sit close enough (55svh phones / 80svh desktop) and each starts revealing as it
        // enters, overlapping the previous one, so no viewport is ever empty.
        const mobile = window.innerWidth < 768;
        splits.forEach((sp, i) => {
          gsap.from(sp.lines, {
            yPercent: 110,
            rotate: 2,
            duration: 1.1,
            ease: "expo.out",
            stagger: 0.09,
            scrollTrigger: { trigger: statements[i], start: mobile ? "top bottom" : "top 95%", once: true },
          });
        });

        // Velocity stretch, Mat Voyce style (capped lower on phones).
        const maxStretch = mobile ? 0.08 : 0.15;
        const stretch = gsap.quickTo(statements, "scaleY", { duration: 0.35, ease: "power3.out" });
        let target = 1;
        tickerFn = () => {
          const v = Math.abs(getLenis()?.velocity ?? 0);
          target = Math.max(target * 0.9 + 0.1, 1 + Math.min(v * 0.0045, maxStretch));
          stretch(target);
        };
        gsap.ticker.add(tickerFn);
        ScrollTrigger.refresh();
      });
      return () => {
        cancelled = true;
        if (tickerFn) gsap.ticker.remove(tickerFn);
        split?.revert();
      };
    },
    [],
    tier !== "static",
  );

  return (
    <section ref={ref} aria-label="Manifesto" className="relative">
      {LINES.map((l) => (
        <div key={l.text} className="gutter flex min-h-[55svh] items-center md:min-h-[80svh]">
          <h2
            data-statement
            className={`w-full origin-bottom text-[15vw] leading-[0.86] md:text-[10.5vw] ${l.align} ${
              l.serif ? "font-serif italic tracking-[-0.02em] text-rust md:text-[13vw]" : "font-extrabold uppercase tracking-[-0.06em]"
            }`}
          >
            {l.text}
          </h2>
        </div>
      ))}
    </section>
  );
}
