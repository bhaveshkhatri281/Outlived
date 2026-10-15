/**
 * Fix 4 check: record the gate opening with 4× CPU throttling and report long
 * tasks (>50ms) and the worst frame gap during the 0.9s fold, plus how long
 * after the fold the page becomes scrollable.
 *   node scripts/qa/gate-fold-perf.mjs [base] [throttle]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const THROTTLE = Number(process.argv[3] ?? 4);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, recordVideo: { dir: "qa/.fold-video", size: { width: 1440, height: 900 } } });
const page = await ctx.newPage();
const issues = [];
page.on("console", (m) => ["error", "warning"].includes(m.type()) && !/DevTools|THREE.Clock/.test(m.text()) && issues.push(m.text().slice(0, 200)));

await page.addInitScript(() => {
  window.__lt = [];
  window.__frames = [];
  try {
    new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__lt.push({ start: e.startTime, dur: e.duration }))).observe({ type: "longtask", buffered: true });
  } catch {}
  const loop = (t) => {
    window.__frames.push(t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.addEventListener("outlived:gate-open", () => (window.__openAt = performance.now()));
});

await page.goto(BASE + "/?gate=1", { waitUntil: "networkidle" });
await page.mouse.move(400, 400);
await page.waitForTimeout(4500); // hero mounts + compiles behind the gate
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });

const box = await page.getByRole("button", { name: "Hold to enter" }).boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForFunction(() => window.__openAt !== undefined, null, { timeout: 8000 });
await page.mouse.up();
// Poll until the gate is gone and scrolling is released.
await page.waitForFunction(() => !document.querySelector('[aria-label="Welcome to OUTLIVED"]'), null, { timeout: 8000, polling: "raf" });
const result = await page.evaluate(() => {
  const open = window.__openAt;
  const gone = performance.now();
  const end = open + 900;
  const lt = window.__lt.filter((e) => e.start + e.dur > open && e.start < end);
  const frames = window.__frames.filter((t) => t >= open && t <= end + 50);
  const gaps = frames.slice(1).map((t, i) => t - frames[i]);
  const scrollable = document.documentElement.style.overflow === "" && !document.documentElement.classList.contains("lenis-stopped");
  return {
    longTasksDuringFold: lt.map((e) => `${Math.round(e.dur)}ms @+${Math.round(e.start - open)}`),
    slowFrames: gaps.map((g, i) => ({ g, at: frames[i + 1] - open })).filter((x) => x.g > 25).map((x) => `${Math.round(x.g)}ms @+${Math.round(x.at)}`),
    framesDuringFold: frames.length,
    worstFrameMs: Math.round(Math.max(...gaps)),
    avgFps: Math.round(1000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length)),
    gateRemovedAfterOpenMs: Math.round(gone - open),
    scrollable,
  };
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
// Can we scroll right away?
await page.mouse.wheel(0, 400);
await page.waitForTimeout(600);
result.scrolledY = await page.evaluate(() => Math.round(window.scrollY));
await ctx.close();
await browser.close();
console.log(JSON.stringify({ throttle: THROTTLE, ...result, issues }, null, 2));
