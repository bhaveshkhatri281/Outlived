"use client";

import { useEffect, useRef } from "react";
import { createHoverGL } from "@/lib/gl/hover-gl";
import { useFinePointer, useMotionTier } from "@/lib/motion/capability";

/** Liquid hover for product images (desktop, capable GPUs only). */
export function HoverGL() {
  const fine = useFinePointer();
  const tier = useMotionTier();
  const ref = useRef<HTMLCanvasElement>(null);
  const enabled = fine && tier === "full";

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const ctl = createHoverGL(ref.current);
    return () => ctl.destroy();
  }, [enabled]);

  if (!enabled) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[30] opacity-0 transition-opacity duration-150"
    />
  );
}
