/**
 * Fix 10 check: scroll the whole homepage at 390px with 4× CPU throttling and
 * report long tasks (>50ms) and frame stats during the scroll.
 *   node scripts/qa/scroll-perf.mjs [base] [throttle] [width]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const THROTTLE = Number(process.argv[3] ?? 4);
const WIDTH = Number(process.argv[4] ?? 390);
const mobile = WIDTH < 768;
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: mobile ? 844 : 900 },
  deviceScaleFactor: mobile ? 3 : 1, // a typical phone DPR, so the canvas DPR cap matters
  isMobile: mobile,
  hasTouch: mobile,
});
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("outlived:entered", "1");
  } catch {}
  window.__lt = [];
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push({ start: e.startTime, dur: e.duration }))).observe({ type: "longtask", buffered: true });
  } catch {}
});
const page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.mouse.move(200, 300); // counts as an interaction: mounts the WebGL hero
await page.waitForTimeout(4000);
const info = await page.evaluate(() => ({
  canvasDpr: (() => {
    const c = document.querySelector("canvas");
    return c ? +(c.width / c.getBoundingClientRect().width).toFixed(2) : null;
  })(),
  rafLoops: null,
}));
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
await page.evaluate(() => {
  window.__t0 = performance.now();
  window.__frames = [];
  const loop = (t) => {
    window.__frames.push(t);
    if (!window.__stop) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
// Thumb-sized swipes on phones (raw touch events; headless ignores synthesized touch gestures),
// mouse-wheel gestures on desktop, top to bottom.
let guard = 0;
while (guard++ < 200) {
  const y = await page.evaluate(() => scrollY);
  if (y >= total - 4) break;
  if (mobile) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: 720 }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 195, y: 720 - i * 40 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(60);
  } else {
    await cdp.send("Input.synthesizeScrollGesture", { x: Math.round(WIDTH / 2), y: 500, yDistance: -600, speed: 1400, gestureSourceType: "mouse" });
  }
}
await page.waitForTimeout(800);
const res = await page.evaluate(() => {
  window.__stop = true;
  const t0 = window.__t0;
  const f = window.__frames;
  const gaps = f.slice(1).map((t, i) => t - f[i]);
  const sorted = [...gaps].sort((a, b) => b - a);
  const lt = window.__lt.filter((e) => e.start >= t0);
  return {
    seconds: +((f[f.length - 1] - f[0]) / 1000).toFixed(1),
    avgFps: Math.round(1000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length)),
    p95FrameMs: Math.round(sorted[Math.floor(sorted.length * 0.05)]),
    worstFrameMs: Math.round(sorted[0]),
    framesOver50ms: gaps.filter((g) => g > 50).length,
    longTasks: lt.length,
    longestTaskMs: Math.round(Math.max(0, ...lt.map((e) => e.dur))),
    reachedBottom: Math.round(scrollY + innerHeight) >= document.documentElement.scrollHeight - 4,
  };
});
console.log(JSON.stringify({ width: WIDTH, throttle: THROTTLE, ...info, ...res }));
await browser.close();
