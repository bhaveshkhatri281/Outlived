"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { refreshScrollTriggerIfLoaded } from "@/lib/motion/gsap";

const SAFETY_MS = 1500;

/**
 * Reveals every `.reveal-clip` exactly once, and makes sure none can stay hidden:
 *  - an IntersectionObserver reveals elements as they enter;
 *  - a sweep (on mount, scroll, resize and load) also reveals anything already in view or
 *    already scrolled past: jumps (End key, reload mid-page, back button) never trigger the
 *    observer. Elements fully above the viewport appear instantly, without animating;
 *  - a safety timeout force-shows anything that entered or passed the viewport and somehow
 *    still isn't revealed 1.5s later.
 * Image loads also trigger a (debounced) ScrollTrigger.refresh(), since layout shifts as they arrive.
 * Before this mounts, CSS plays the reveals on a timer (html:not(.reveal-armed)), so content
 * above the fold never waits for hydration.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const reveal = (el: Element, instant = false) => {
      if (el.classList.contains("is-in")) return;
      if (instant) el.classList.add("reveal-instant");
      el.classList.add("is-in");
      io.unobserve(el);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) reveal(e.target);
          else if (e.boundingClientRect.bottom < 0) reveal(e.target, true); // passed above
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    const pending = () => document.querySelectorAll(".reveal-clip:not(.is-in)");
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const sweep = () => {
      const vh = window.innerHeight;
      pending().forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0) reveal(el, true);
        else if (r.top < vh) {
          reveal(el);
        }
        // Safety net: once it has reached the viewport, it must be visible within 1.5s.
        if (r.top < vh && !timers.has(el)) timers.set(el, setTimeout(() => reveal(el, true), SAFETY_MS));
      });
    };
    const scan = (root: ParentNode) => root.querySelectorAll(".reveal-clip:not(.is-in)").forEach((el) => io.observe(el));

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sweep();
      });
    };
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const onLoad = (e: Event) => {
      if (!(e.target instanceof HTMLImageElement)) return;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(refreshScrollTriggerIfLoaded, 150);
    };

    scan(document);
    sweep();
    // Hand over from the CSS timer fallback (see .reveal-clip in globals.css) to this observer.
    document.documentElement.classList.add("reveal-armed");
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n instanceof Element && (n.matches(".reveal-clip") ? io.observe(n) : scan(n)));
      sweep();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", sweep);
    document.addEventListener("load", onLoad, true); // image load events don't bubble; capture them
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(refreshTimer);
      timers.forEach((t) => clearTimeout(t));
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("load", sweep);
      document.removeEventListener("load", onLoad, true);
    };
  }, [pathname]);
  return null;
}
