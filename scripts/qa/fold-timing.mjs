/**
 * Above-the-fold visibility on a direct (cold) load: for every image and heading
 * in the first viewport, when it is loaded vs when it is actually visible
 * (effective opacity ≥ 0.95, no clip hiding it, not covered by an overlay).
 *   node scripts/qa/fold-timing.mjs [base] [paths] [widths]
 *   FRESH=1 …   first visit (entry gate not yet passed in this tab)
 *   SLOWJS=4000 …   hold every JS chunk back 4s (slow phone / dev compile), so
 *                   anything that waits for hydration to become visible shows up
 * Budget: everything above the fold visible < 600ms.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PATHS = (process.argv[3] ?? "/vault/book-jacket-wrap,/evidence,/manifesto,/vault").split(",");
const WIDTHS = (process.argv[4] ?? "390,1440").split(",").map(Number);
const BUDGET = 600;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
let fail = 0;
for (const w of WIDTHS) {
  for (const path of PATHS) {
    // A real browser UA: the gate script skips UAs that say "headless".
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: w, height: w < 768 ? 844 : 900 }, isMobile: w < 768, hasTouch: w < 768 });
    // Default: a returning visitor (gate already passed), so this measures the page, not the ritual.
    await ctx.addInitScript((fresh) => {
      try {
        if (!fresh) sessionStorage.setItem("outlived:entered", "1");
      } catch {}
      const seen = new Map();
      const loaded = new Map();
      const key = (el) => (el.tagName === "IMG" ? `img ${(el.currentSrc || el.src).split("/").slice(-2).join("/").split("?")[0]}` : `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 24)}"`);
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return null; // off screen: not above the fold
        let op = 1;
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.visibility === "hidden" || cs.display === "none") return false;
          op *= parseFloat(cs.opacity);
          const cp = cs.clipPath;
          if (cp && cp !== "none" && /inset\((?:100%|[5-9]\d(?:\.\d+)?%)/.test(cp)) return false;
        }
        if (op < 0.95) return false;
        if (["pending", "up"].includes(document.documentElement.dataset.gate ?? "")) return false; // entry gate covers the page
        const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
        const y = Math.min(innerHeight - 1, Math.max(0, r.top + Math.min(r.height / 2, 80)));
        const hit = document.elementFromPoint(x, y);
        if (!hit) return false;
        const hs = getComputedStyle(hit);
        // Covered by a full-screen overlay (transition panels, gate)?
        if (!el.contains(hit) && !hit.contains(el) && hs.position === "fixed" && parseFloat(hs.opacity) > 0.5 && hit.getBoundingClientRect().width >= innerWidth * 0.9) return false;
        return true;
      };
      const tick = () => {
        const t = performance.now();
        for (const el of document.querySelectorAll("main img, main h1, h1")) {
          const k = key(el);
          if (el.tagName === "IMG" && el.complete && el.naturalWidth && !loaded.has(k)) loaded.set(k, t);
          const v = visible(el);
          if (v === null) continue;
          if (v && !seen.has(k)) seen.set(k, t);
        }
        if (t < 8000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      window.__fold = () => {
        const out = [];
        for (const el of document.querySelectorAll("main img, main h1, h1")) {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.bottom <= 0 || r.top >= innerHeight) continue;
          const k = key(el);
          out.push({ k, loaded: loaded.get(k) ?? null, visible: seen.get(k) ?? null });
        }
        return out;
      };
    }, !!process.env.FRESH);
    const page = await ctx.newPage();
    const slow = Number(process.env.SLOWJS) || 0;
    if (slow) await page.route(/\/_next\/static\/chunks\/.*\.js/, async (r) => (await new Promise((res) => setTimeout(res, slow)), r.continue()));
    await page.goto(BASE + path, { waitUntil: "load" });
    await page.waitForTimeout(6500);
    const items = (await page.evaluate(() => window.__fold())).filter((v, i, a) => a.findIndex((x) => x.k === v.k) === i);
    // Only images that ended up visible count as above-the-fold content (crossfade layers stay hidden by design).
    const counted = items.filter((x) => x.visible !== null || !x.k.startsWith("img"));
    const worst = counted.length ? Math.max(...counted.map((x) => x.visible ?? Infinity)) : Infinity;
    const ok = worst < BUDGET;
    if (!ok) fail++;
    console.log(`${ok ? "OK  " : "SLOW"} ${w} ${path.padEnd(26)} worst ${Number.isFinite(worst) ? Math.round(worst) + "ms" : "never"}`);
    for (const x of counted) console.log(`       ${x.k.padEnd(48)} loaded ${x.loaded === null ? "-" : Math.round(x.loaded)}  visible ${x.visible === null ? "never" : Math.round(x.visible)}`);
    await ctx.close();
  }
}
await browser.close();
console.log(fail ? `${fail} slow page load(s)` : `all above-the-fold content visible < ${BUDGET}ms`);
