/** Hides candidate elements one by one and reports which one makes horizontal overflow disappear. */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000/";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem("outlived-entered", "1"));
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const base = document.documentElement.scrollWidth;
  const out = [];
  const candidates = [...document.querySelectorAll("main > *, main > * > *, main > * > * > *, footer, header, body > *")];
  for (const el of candidates) {
    const prev = el.style.display;
    el.style.display = "none";
    await frame();
    const w = document.documentElement.scrollWidth;
    el.style.display = prev;
    if (w < base) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 90)} → ${w}`);
  }
  return { base, out };
});
console.log(JSON.stringify(res, null, 2));
await browser.close();
