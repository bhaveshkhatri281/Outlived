"use client";

import { getMotionTier } from "@/lib/motion/capability";

/**
 * Shared-element navigation: the clicked card image flies into the product
 * page hero (View Transitions API). Browsers without it just navigate.
 *
 * The product hero marks itself with `data-vt-hero`; CSS gives it
 * `view-transition-name: product-hero` except while `html[data-vt-leaving]`
 * is set, so the outgoing page never has two elements with the same name.
 */
let pending: ((img?: HTMLImageElement | null) => void) | null = null;

/** Called by the product page once its hero image is in the DOM. */
export function markHeroReady(img?: HTMLImageElement | null) {
  pending?.(img);
  pending = null;
}

type Push = (href: string) => void;

export function navigateShared(href: string, source: HTMLElement, push: Push) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> };
  };
  if (!doc.startViewTransition || getMotionTier() === "static") {
    push(href);
    return;
  }
  const root = document.documentElement;
  root.dataset.vtLeaving = "1";
  source.style.viewTransitionName = "product-hero";

  const transition = doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const finish = () => {
          delete root.dataset.vtLeaving;
          resolve();
        };
        const timeout = setTimeout(finish, 900);
        pending = (img) => {
          const done = () => {
            clearTimeout(timeout);
            finish();
          };
          // Wait (briefly) for the hero to decode so the snapshot isn't blank.
          if (img && !img.complete) Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 450))]).then(done);
          else done();
        };
        push(href);
      }),
  );
  transition.finished.finally(() => {
    source.style.viewTransitionName = "";
    delete root.dataset.vtLeaving;
  });
}
