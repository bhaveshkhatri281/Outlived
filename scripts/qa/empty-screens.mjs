/**
 * Fix 6 check: scroll a page slowly at 390px and flag any viewport that is
 * (almost) entirely black below the header. Also reports total scroll height
 * of a section if a selector is given.
 *   node scripts/qa/empty-screens.mjs [url] [step]
 */
import { chromium } from "playwright";
import sharp from "sharp";

const url = process.argv[2] ?? "http://localhost:3000/";
const step = Number(process.argv[3] ?? 160);
const W = Number(process.argv[4] ?? 390);
const H = W < 768 ? 844 : 900;
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: W < 768, hasTouch: W < 768, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("outlived:entered", "1");
  } catch {}
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const manifesto = await page.evaluate(() => {
  const el = document.querySelector('section[aria-label="Manifesto"]');
  return el ? Math.round(el.getBoundingClientRect().height) : null;
});
const empty = [];
let checked = 0;
for (let y = 0; y <= total; y += step) {
  // Scroll the way a thumb does (small wheel steps), so reveal triggers fire naturally.
  await page.evaluate((to) => window.scrollTo(0, to), y);
  await page.waitForTimeout(450);
  const buf = await page.screenshot({ clip: { x: 0, y: 66, width: W, height: H - 66 } });
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  let lit = 0;
  const ch = info.channels;
  for (let i = 0; i < data.length; i += ch) if (data[i] > 70) lit++;
  const ratio = lit / (data.length / ch);
  checked++;
  if (ratio < 0.003) empty.push({ y, ratio: +ratio.toFixed(4) });
}
console.log(JSON.stringify({ url, checked, scrollHeight: total, manifestoSectionHeight: manifesto, emptyViewports: empty }, null, 2));
await browser.close();
