"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(QUERY).matches;
}

/** Live `prefers-reduced-motion` value. Server render assumes motion is allowed. */
export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
