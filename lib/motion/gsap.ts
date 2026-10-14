import { getLenis, onLenisChange } from "./lenis";

/** Motion spec (brief §8). */
export const EASE = {
  reveal: "power3.out",
  transition: "power2.inOut",
  fold: "expo.out",
} as const;

export const DURATION = {
  micro: 0.2,
  reveal: 0.75,
  transition: 0.6,
} as const;

export const STAGGER_WORDS = 0.04;

type Loaded = {
  gsap: typeof import("gsap").gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
};

let scrollTriggerPromise: Promise<Loaded> | null = null;

/**
 * Loads GSAP + ScrollTrigger on demand, so pages without scroll effects
 * never download the plugin. Keeps ScrollTrigger in sync with Lenis.
 */
export function loadScrollTrigger(): Promise<Loaded> {
  scrollTriggerPromise ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
    ([gsapMod, stMod]) => {
      const { gsap } = gsapMod;
      const { ScrollTrigger } = stMod;
      gsap.registerPlugin(ScrollTrigger);

      let detach: (() => void) | undefined;
      const attach = (lenis: ReturnType<typeof getLenis>) => {
        detach?.();
        detach = lenis ? lenis.on("scroll", ScrollTrigger.update) : undefined;
        ScrollTrigger.refresh();
      };
      attach(getLenis());
      onLenisChange(attach);

      return { gsap, ScrollTrigger };
    },
  );
  return scrollTriggerPromise;
}
