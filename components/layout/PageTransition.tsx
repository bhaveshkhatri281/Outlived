"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getMotionTier } from "@/lib/motion/capability";
import { playFold } from "@/lib/sound";

const CLOSE_MS = 250;
const OPEN_MS = 320;
// Bag and checkout are 0/10 animation.
const NO_TRANSITION = ["/bag", "/checkout"];

/**
 * Fold wipe between pages: two ink panels hinge closed from the top and
 * bottom like a book, the route changes, then they open. The click is never
 * blocked: the route change starts on click, in parallel with the ~250ms close; the
 * panels open once the new route has rendered (whole wipe ≤ 650ms).
 * Card clicks use the shared-element transition instead (`data-shared`).
 */
export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "closing" | "opening">("idle");
  const target = useRef<string | null>(null);
  const closeStart = useRef(0);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target || a.hasAttribute("download") || a.hasAttribute("data-shared")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      const from = location.pathname;
      const to = url.pathname;
      if (to === from) return; // same page (or just a query/hash change)
      if (getMotionTier() === "static") return;
      if (NO_TRANSITION.some((p) => to.startsWith(p) || from.startsWith(p))) return;

      e.preventDefault();
      target.current = url.pathname + url.search + url.hash;
      setPhase("closing");
      playFold();
      // Navigate immediately, in parallel with the panels closing (prefetched routes render at once).
      closeStart.current = performance.now();
      router.push(target.current);
    };
    // Capture phase: runs before next/link's handler, which then sees defaultPrevented and stands down.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  // New route rendered: open the panels.
  useEffect(() => {
    if (phase !== "closing" || !target.current) return;
    if (new URL(target.current, location.origin).pathname !== pathname) return;
    // Open once the new route has rendered AND the panels have finished closing.
    const wait = Math.max(0, CLOSE_MS - (performance.now() - closeStart.current));
    const t = setTimeout(() => {
      setPhase("opening");
      setTimeout(() => setPhase("idle"), OPEN_MS);
    }, wait);
    return () => clearTimeout(t);
  }, [pathname, phase]);

  // Safety: never leave the panels closed.
  useEffect(() => {
    if (phase !== "closing") return;
    const t = setTimeout(() => setPhase("opening"), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "idle") return null;
  const closed = phase === "closing";
  const panel = "absolute inset-x-0 h-1/2 bg-ink";
  const ease = closed ? "var(--ease-transition)" : "var(--ease-fold)";
  const dur = closed ? CLOSE_MS : OPEN_MS;

  return (
    <div key={phase} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[150] [perspective:1400px]">
      <div
        className={`${panel} top-0 origin-top border-b border-line motion-safe:animate-[fold-top-in_var(--d)_var(--e)_both]`}
        style={{ ["--d" as string]: `${dur}ms`, ["--e" as string]: ease, animationDirection: closed ? "normal" : "reverse" }}
      />
      <div
        className={`${panel} bottom-0 origin-bottom border-t border-line motion-safe:animate-[fold-bottom-in_var(--d)_var(--e)_both]`}
        style={{ ["--d" as string]: `${dur}ms`, ["--e" as string]: ease, animationDirection: closed ? "normal" : "reverse" }}
      />
    </div>
  );
}
