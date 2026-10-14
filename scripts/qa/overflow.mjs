/** Lists elements that extend past the viewport width at 390px (horizontal overflow hunting). */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000/";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem("outlived-entered", "1"));
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const res = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && r.width > 0) {
      // only report elements whose ancestors don't clip them
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (s.overflowX !== "visible") {
          clipped = true;
          break;
        }
      }
      if (!clipped) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} right=${Math.round(r.right)}`);
    }
  }
  const iw = innerWidth;
  const rightmost = [...document.querySelectorAll("body *")]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter((x) => x.r.width > 0 && Math.round(x.r.width) !== iw && x.r.right > vw + 1)
    .sort((a, b) => b.r.right - a.r.right)
    .slice(0, 8)
    .map((x) => `${x.el.tagName.toLowerCase()}.${String(x.el.className).slice(0, 70)} left=${Math.round(x.r.left)} right=${Math.round(x.r.right)}`);
  console.log(rightmost);
  window.__rightmost = rightmost;
  const widest = [...document.querySelectorAll("main *")]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter((x) => x.r.width > vw + 1)
    .sort((a, b) => b.r.width - a.r.width)
    .slice(0, 8)
    .map((x) => `${x.el.tagName.toLowerCase()}.${String(x.el.className).slice(0, 70)} w=${Math.round(x.r.width)}`);
  return { vw, scrollW: document.documentElement.scrollWidth, innerW: innerWidth, out: out.slice(0, 15), widest, rightmost };
});
console.log(JSON.stringify(res, null, 2));
await browser.close();
