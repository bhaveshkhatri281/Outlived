"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getLenis, setLenis } from "@/lib/motion/lenis";
import { useReducedMotion } from "@/lib/motion/reduced-motion";

// Bag and checkout are 0/10 animation: native scroll only.
const NATIVE_SCROLL = ["/bag", "/checkout"];

/** Lenis smooth scroll. Never hijacks direction or locks the page; off for reduced motion. */
export function SmoothScroll() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const enabled = !reduced && !NATIVE_SCROLL.some((p) => pathname.startsWith(p));
  const popped = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({ autoRaf: true, anchors: true, lerp: 0.12 });
    setLenis(lenis);
    return () => {
      setLenis(null);
      lenis.destroy();
    };
  }, [enabled]);

  // New pages start at the top; back/forward keeps the browser's restored position.
  useEffect(() => {
    const onPop = () => (popped.current = true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (!popped.current) getLenis()?.scrollTo(0, { immediate: true, force: true });
    popped.current = false;
  }, [pathname]);

  return null;
}
