/**
 * Fix C check: at 360 / 390 / 768px, find every big title (font-size ≥ 36px) and
 * report words that break across lines or overflow the viewport.
 *   node scripts/qa/title-check.mjs [base]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PAGES = ["/", "/vault", "/evidence", "/manifesto", "/bag", "/info/size-guide", "/this-page-does-not-exist", "/vault/pleated-hem-wings", "/vault/turned-page-sleeves", "/vault/soft-tessellation", "/vault/concertina-shoulders"];
const browser = await chromium.launch();
let problems = 0;
for (const w of (process.argv[3] ?? "360,390,768").split(",").map(Number)) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: w < 768, hasTouch: w < 768 });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("outlived:entered", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  for (const p of PAGES) {
    await page.goto(BASE + p, { waitUntil: "networkidle" });
    await page.waitForTimeout(1300); // kinetic letters settle
    const issues = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      const big = [...document.querySelectorAll("h1,h2,h3,p,span,em")].filter((el) => {
        if (el.closest("[aria-hidden=true]") && !el.closest("[aria-label]")) return false;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        return fs >= 36 && el.offsetParent !== null && el.textContent.trim();
      });
      const seen = new Set();
      for (const el of big) {
        // Kinetic titles: one span per letter, grouped in word spans.
        const chars = el.querySelectorAll(".kinetic-char");
        if (chars.length) {
          const words = new Map();
          chars.forEach((c) => {
            const w = c.parentElement;
            if (!words.has(w)) words.set(w, []);
            words.get(w).push(c.getBoundingClientRect());
          });
          for (const [wEl, rects] of words) {
            const tops = new Set(rects.map((r) => Math.round(r.top / 4)));
            const word = wEl.textContent.replace(/ /g, "").trim();
            if (tops.size > 1) out.push(`BREAK "${word}"`);
            if (Math.max(...rects.map((r) => r.right)) > vw + 1) out.push(`OVERFLOW "${word}"`);
          }
          continue;
        }
        // Plain text: measure each word with a Range.
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (seen.has(node) || node.parentElement.closest(".kinetic-char")) continue;
          seen.add(node);
          const re = /\S+/g;
          let m;
          while ((m = re.exec(node.data))) {
            const r = document.createRange();
            r.setStart(node, m.index);
            r.setEnd(node, m.index + m[0].length);
            const rects = [...r.getClientRects()].filter((x) => x.width > 1);
            const tops = new Set(rects.map((x) => Math.round(x.top / 4)));
            if (tops.size > 1) out.push(`BREAK "${m[0]}"`);
            if (rects.some((x) => x.right > vw + 1)) out.push(`OVERFLOW "${m[0]}"`);
          }
        }
      }
      return [...new Set(out)];
    });
    if (issues.length) {
      problems += issues.length;
      console.log(`${w} ${p}: ${issues.join(", ")}`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log(problems ? `${problems} problem(s)` : "no title breaks or overflows");
