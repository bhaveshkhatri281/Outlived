/**
 * Console check: loads pages at 390px and 1440px, scrolls through each, and
 * reports every console error / warning (incl. React + hydration warnings).
 *   node scripts/qa/console.mjs [base] [paths]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PATHS = (process.argv[3] ?? "/,/vault,/vault/book-jacket-wrap,/bag").split(",");
const VIEWPORTS = [
  { name: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "1440", viewport: { width: 1440, height: 900 } },
];
// Dev-only noise that is not an app problem.
const IGNORE = [/Download the React DevTools/, /\[Fast Refresh\]/, /\[HMR\]/];

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
let total = 0;
for (const vp of VIEWPORTS) {
  for (const p of PATHS) {
    const ctx = await browser.newContext(vp);
    await ctx.addInitScript(() => {
      try {
        sessionStorage.setItem("outlived:entered", "1");
      } catch {}
    });
    const page = await ctx.newPage();
    const msgs = [];
    page.on("console", (m) => {
      if (!["error", "warning"].includes(m.type())) return;
      if (IGNORE.some((r) => r.test(m.text()))) return;
      msgs.push(`${m.type()}: ${m.text().slice(0, 240)}`);
    });
    page.on("pageerror", (e) => msgs.push(`pageerror: ${String(e).slice(0, 240)}`));
    await page.goto(BASE + p, { waitUntil: "networkidle" });
    await page.mouse.move(300, 300);
    await page.waitForTimeout(1200);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 700) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(600);
    total += msgs.length;
    console.log(`${vp.name.padEnd(5)} ${p.padEnd(26)} ${msgs.length ? msgs.length + " issue(s)" : "clean"}`);
    msgs.slice(0, 6).forEach((m) => console.log(`      ${m}`));
    await ctx.close();
  }
}
await browser.close();
process.exit(total ? 1 : 0);
