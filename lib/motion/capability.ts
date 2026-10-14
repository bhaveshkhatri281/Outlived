"use client";

import { useSyncExternalStore } from "react";

/**
 * How much motion this device gets:
 *  - "full":   WebGL moments + all scroll/CSS effects
 *  - "lite":   no WebGL (weak GPU, low memory, Save-Data, battery saver); CSS/GSAP effects stay
 *  - "static": prefers-reduced-motion; fades only, no pins, no WebGL
 * `?motion=full|lite|static` overrides it for testing.
 */
export type MotionTier = "full" | "lite" | "static";

const RANK: Record<MotionTier, number> = { static: 0, lite: 1, full: 2 };

let tier: MotionTier | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function weakGpu() {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /swiftshader|llvmpipe|software|basic render|mali-[2-4]\d\d|adreno \(tm\) [2-4]\d\d|powervr sgx/i.test(renderer);
  } catch {
    return true;
  }
}

function detect(): MotionTier {
  const forced = new URLSearchParams(location.search).get("motion");
  if (forced === "full" || forced === "lite" || forced === "static") return forced;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return "lite";
  if ((nav.deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency ?? 8) <= 2) return "lite";
  if (weakGpu()) return "lite";
  return "full";
}

function init() {
  if (tier) return;
  tier = detect();
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => {
    tier = detect();
    emit();
  });
  // Battery saver: drop WebGL when unplugged and low.
  const nav = navigator as Navigator & { getBattery?: () => Promise<{ charging: boolean; level: number }> };
  nav.getBattery?.().then((b) => {
    if (!b.charging && b.level < 0.2) downgradeTier("lite");
  }).catch(() => {});
}

export function getMotionTier(): MotionTier {
  if (typeof window === "undefined") return "lite";
  init();
  return tier!;
}

/** Lower the tier at runtime (e.g. a WebGL scene measured < 40fps). Never raises it. */
export function downgradeTier(to: MotionTier) {
  if (!tier || RANK[to] >= RANK[tier]) return;
  tier = to;
  emit();
}

/** Server and first client render assume "lite" (no WebGL) so markup always matches. */
export function useMotionTier(): MotionTier {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getMotionTier,
    () => "lite",
  );
}

export function useFinePointer() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    () => false,
  );
}
