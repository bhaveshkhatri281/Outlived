"use client";

import { useEffect, type DependencyList, type RefObject } from "react";
import { loadScrollTrigger } from "./gsap";

type Loaded = Awaited<ReturnType<typeof loadScrollTrigger>>;

/**
 * Runs a GSAP/ScrollTrigger setup scoped to `scope`, loading the plugin on
 * demand. Everything created inside is reverted (tweens killed, ScrollTriggers
 * removed, inline styles restored) on unmount or when deps change, which also
 * covers route changes.
 */
export function useGsap(
  scope: RefObject<HTMLElement | null>,
  setup: (lib: Loaded, el: HTMLElement) => void | (() => void),
  deps: DependencyList,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || !scope.current) return;
    let cancelled = false;
    let revert: (() => void) | undefined;
    loadScrollTrigger().then((lib) => {
      const el = scope.current;
      if (cancelled || !el) return;
      let extra: void | (() => void);
      const ctx = lib.gsap.context(() => {
        extra = setup(lib, el);
      }, el);
      revert = () => {
        if (typeof extra === "function") extra();
        ctx.revert();
      };
    });
    return () => {
      cancelled = true;
      revert?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);
}
