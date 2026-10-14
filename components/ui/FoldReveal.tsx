"use client";

import { useRef, type ReactNode } from "react";
import { useMotionTier } from "@/lib/motion/capability";
import { useGsap } from "@/lib/motion/useGsap";

/**
 * Wraps a block so it unfolds from creased strips as it scrolls in (the
 * archive "page" motif). Renders the content once for layout and once per
 * strip (clipped), so text stays crisp; only the first copy is exposed to
 * assistive tech.
 */
export function FoldReveal({ children, strips = 3, className = "" }: { children: ReactNode; strips?: number; className?: string }) {
  const tier = useMotionTier();
  const ref = useRef<HTMLDivElement>(null);
  const animated = tier !== "static";

  useGsap(
    ref,
    ({ gsap }, el) => {
      const parts = gsap.utils.toArray<HTMLElement>("[data-strip]", el);
      const shades = gsap.utils.toArray<HTMLElement>("[data-shade]", el);
      const st = { trigger: el, start: "top 92%", end: "top 45%", scrub: 0.6 };
      gsap.fromTo(parts, { rotateX: (i: number) => (i % 2 ? -76 : 76) }, { rotateX: 0, ease: "expo.out", scrollTrigger: st });
      gsap.fromTo(shades, { opacity: 0.85 }, { opacity: 0, ease: "power2.out", scrollTrigger: st });
    },
    [],
    animated,
  );

  if (!animated) return <div className={className}>{children}</div>;

  return (
    <div ref={ref} className={`relative overflow-hidden [perspective:1400px] ${className}`}>
      <div className="invisible" aria-hidden="true">
        {children}
      </div>
      {Array.from({ length: strips }).map((_, i) => (
        <div
          key={i}
          data-strip
          aria-hidden={i > 0}
          className="absolute inset-0 overflow-hidden bg-inherit"
          style={{
            clipPath: `inset(${(i / strips) * 100}% 0 ${100 - ((i + 1) / strips) * 100}% 0)`,
            transformOrigin: `50% ${((i + 0.5) / strips) * 100}%`,
          }}
        >
          {children}
          <div data-shade className="pointer-events-none absolute inset-0 bg-ink opacity-0" />
        </div>
      ))}
    </div>
  );
}
