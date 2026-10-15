/**
 * Screenshots at given scroll positions.
 *   node scripts/qa/shots.mjs <url> <width> <name> <y1,y2,...|selector@offset,...>
 * A position can be a number (px) or "css-selector@px" (scroll so the element's top is px below the viewport top).
 */
import { chromium } from "playwright";

const [url, width = "390", name = "shot", positions = "0"] = process.argv.slice(2);
const w = Number(width);
const mobile = w < 768;
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({
  viewport: { width: w, height: mobile ? 844 : 900 },
  deviceScaleFactor: mobile ? 2 : 1,
  isMobile: mobile,
  hasTouch: mobile,
});
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("outlived:entered", "1");
  } catch {}
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
if (!mobile) await page.mouse.move(w / 2, 450);
await page.waitForTimeout(1500);
let n = 0;
for (const pos of positions.split(",")) {
  const y = pos.includes("@")
    ? await page.evaluate(([sel, off]) => {
        const el = document.querySelector(sel);
        return el ? Math.round(el.getBoundingClientRect().top + scrollY - Number(off)) : 0;
      }, pos.split("@"))
    : Number(pos);
  // Approach in small steps so scroll-driven effects play as they would for a person.
  const from = await page.evaluate(() => scrollY);
  const steps = Math.max(1, Math.round(Math.abs(y - from) / 120));
  for (let i = 1; i <= steps; i++) {
    await page.evaluate((v) => window.scrollTo(0, v), Math.round(from + ((y - from) * i) / steps));
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(1300);
  const file = `qa/${name}-${w}-${++n}.png`;
  await page.screenshot({ path: file });
  console.log(file, "y=" + y);
}
await browser.close();
