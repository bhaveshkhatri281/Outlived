/**
 * Fix D / checklist 4: jump straight to the bottom (End key), then scroll back up in steps and
 * check that every image is loaded and visible (reveal fired, clip-path not stuck at 100%).
 * Also flags mostly-empty viewports on the way up.
 *   node scripts/qa/jump-test.mjs [base] [paths] [width]
 */
import { chromium } from "playwright";
import sharp from "sharp";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PATHS = (process.argv[3] ?? "/,/vault,/evidence").split(",");
const W = Number(process.argv[4] ?? 390);
const browser = await chromium.launch();
for (const p of PATHS) {
  const ctx = await browser.newContext({ viewport: { width: W, height: W < 768 ? 844 : 900 }, isMobile: W < 768, hasTouch: W < 768 });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("outlived:entered", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(BASE + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.keyboard.press("End");
  await page.waitForTimeout(1500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const empty = [];
  for (let y = total; y >= 0; y -= 700) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(250);
    if (p === "/evidence") {
      const buf = await page.screenshot({ clip: { x: 0, y: 70, width: W, height: (W < 768 ? 844 : 900) - 70 } });
      const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
      let lit = 0;
      for (let i = 0; i < data.length; i += info.channels) if (data[i] > 45) lit++;
      if (lit / (data.length / info.channels) < 0.04) empty.push(y);
    }
  }
  await page.waitForTimeout(2000); // safety net window
  const res = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("main img")].filter((i) => i.getBoundingClientRect().width > 0 && getComputedStyle(i).display !== "none");
    const notLoaded = imgs.filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.getAttribute("alt"));
    const hidden = [...document.querySelectorAll(".reveal-clip")].filter((el) => !el.classList.contains("is-in")).length;
    return { images: imgs.length, notLoaded, hiddenReveals: hidden };
  });
  console.log(JSON.stringify({ page: p, width: W, ...res, emptyViewportsAt: empty }));
  await ctx.close();
}
await browser.close();
