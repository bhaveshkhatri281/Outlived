import type Lenis from "lenis";

// The active Lenis instance (null when smooth scroll is off: reduced motion, bag/checkout, SSR).
let instance: Lenis | null = null;
const listeners = new Set<(lenis: Lenis | null) => void>();

export function getLenis() {
  return instance;
}

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
  listeners.forEach((fn) => fn(lenis));
}

export function onLenisChange(fn: (lenis: Lenis | null) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
