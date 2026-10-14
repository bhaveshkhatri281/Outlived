"use client";

import { useRef } from "react";
import { useMotionTier } from "@/lib/motion/capability";
import { useGsap } from "@/lib/motion/useGsap";

/** Long-form statements whose words light up one by one as you scroll (scrubbed). */
export function Statements({ lines, className = "" }: { lines: { text: string; serif?: boolean }[]; className?: string }) {
  const tier = useMotionTier();
  const ref = useRef<HTMLDivElement>(null);

  useGsap(
    ref,
    ({ gsap, ScrollTrigger }, el) => {
      let cancelled = false;
      let revert: (() => void) | undefined;
      import("gsap/SplitText").then(({ SplitText }) => {
        if (cancelled) return;
        gsap.registerPlugin(SplitText);
        const blocks = gsap.utils.toArray<HTMLElement>("[data-words]", el);
        // aria: "none" keeps the words readable as normal text (no aria-label on the <p>).
        const splits = blocks.map((b) => SplitText.create(b, { type: "words", aria: "none" }));
        revert = () => splits.forEach((s) => s.revert());
        splits.forEach((s, i) => {
          gsap.fromTo(
            s.words,
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              ease: "power3.out",
              stagger: 0.04,
              scrollTrigger: { trigger: blocks[i], start: "top 82%", end: "bottom 52%", scrub: 0.5 },
            },
          );
        });
        ScrollTrigger.refresh();
      });
      return () => {
        cancelled = true;
        revert?.();
      };
    },
    [],
    tier !== "static",
  );

  return (
    <div ref={ref} className={className}>
      {lines.map((l, i) => (
        <p
          key={i}
          data-words
          className={`gutter flex min-h-[80svh] items-center md:min-h-[90svh] ${
            l.serif
              ? "font-serif text-[15vw] italic leading-[0.95] text-rust md:text-[10vw]"
              : "text-[10.5vw] font-extrabold uppercase leading-[0.9] tracking-[-0.05em] md:text-[6.4vw]"
          } ${i % 2 ? "md:justify-end md:text-right" : ""}`}
        >
          <span className="block max-w-[15ch]">{l.text}</span>
        </p>
      ))}
    </div>
  );
}
