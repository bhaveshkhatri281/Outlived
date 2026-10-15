/**
 * Round 3 route sweep. For every route × width:
 *  - HTTP status, console errors + warnings (incl. React/hydration), page errors
 *  - horizontal overflow (scrollWidth vs clientWidth) and what causes it
 *  - clipped controls: buttons / links / inputs whose text is cut (scrollWidth > clientWidth)
 *    or that stick out of the viewport
 *  - fast scroll + jump to bottom, then every image must end up loaded and visible
 * With REDUCED=1 it emulates prefers-reduced-motion and also checks there are no
 * ScrollTrigger pins and that content is visible.
 *   node scripts/qa/round3-routes.mjs [base] [widths] [paths]
 */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const WIDTHS = (process.argv[3] ?? "360,390,1440,1920").split(",").map(Number);
const REDUCED = !!process.env.REDUCED;

// Era 03 teasers: images exist, product pages 404 until they launch (status !== "live").
const UNRELEASED = ["capillary-flow", "mercury-tide"];
const slugs = fs.readdirSync("public/products").filter((s) => fs.statSync(`public/products/${s}`).isDirectory());
const PATHS = process.argv[4]
  ? process.argv[4].split(",")
  : ["/", "/vault", ...slugs.filter((s) => !UNRELEASED.includes(s)).map((s) => `/vault/${s}`), "/bag", "/evidence", "/manifesto", "/info/size-guide", "/info/shipping-returns", "/info/contact", "/info/privacy", "/info/terms", "/this-page-does-not-exist"];

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const problems = [];
for (const w of WIDTHS) {
  const mobile = w < 768;
  const ctx = await browser.newContext({
    viewport: { width: w, height: mobile ? 844 : 1000 },
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: REDUCED ? "reduce" : "no-preference",
  });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("outlived:entered", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  let logs = [];
  page.on("console", (m) => {
    if (m.type() !== "error" && m.type() !== "warning") return;
    const t = m.text();
    if (/Failed to load resource: the server responded with a status of 404/.test(t) && page.url().includes("does-not-exist")) return; // the 404 page's own status
    logs.push(`${m.type()}: ${t.slice(0, 220)}`);
  });
  page.on("pageerror", (e) => logs.push(`pageerror: ${e.message.slice(0, 220)}`));

  for (const p of PATHS) {
    logs = [];
    const res = await page.goto(BASE + p, { waitUntil: "networkidle" });
    const status = res?.status();
    await page.waitForTimeout(900);

    // Overflow + clipped controls at the top of the page.
    const layout = await page.evaluate(() => {
      const de = document.documentElement;
      const vw = de.clientWidth;
      const out = { overflow: de.scrollWidth - vw, culprits: [], clipped: [] };
      if (out.overflow > 0) {
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== "fixed") out.culprits.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} right=${Math.round(r.right)}`);
          if (out.culprits.length > 4) break;
        }
      }
      for (const el of document.querySelectorAll("button, a, input, select, label, [role=button]")) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (!r.width || cs.visibility === "hidden" || el.closest("[aria-hidden=true]")) continue;
        if (r.width <= 1 || el.classList.contains("sr-only")) continue; // screen-reader-only (skip link): clipped by design
        if (el.closest(".no-scrollbar, [data-swipe], [class*='overflow-x-auto']")) continue; // horizontal scrollers clip by design
        const text = (el.innerText || el.value || "").trim();
        if (text && el.scrollWidth > el.clientWidth + 2 && cs.overflow !== "visible" && cs.textOverflow !== "ellipsis") out.clipped.push(`cut "${text.slice(0, 30)}"`);
        if (r.right > vw + 1 && cs.position !== "fixed") out.clipped.push(`off-screen "${text.slice(0, 30)}" right=${Math.round(r.right)}`);
      }
      out.clipped = [...new Set(out.clipped)].slice(0, 6);
      return out;
    });

    // Fast scroll down, jump to the bottom, then back up; every image must end up visible.
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += 900) await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.keyboard.press("End");
    await page.waitForTimeout(700);
    for (let y = total; y >= 0; y -= 800) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(1800);
    const imgs = await page.evaluate(async () => {
      const bad = [];
      for (const img of document.querySelectorAll("main img")) {
        const cs = getComputedStyle(img);
        if (cs.display === "none" || img.closest("[aria-hidden=true]")) continue;
        const r = img.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        // Swipe rows and crossfade layers stack hidden views by design: judge the visible one.
        let op = 1;
        for (let n = img; n && n !== document.body; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity);
        if (op < 0.05) continue;
        img.scrollIntoView({ block: "center" });
        await new Promise((res) => setTimeout(res, 60));
        if (img.loading === "lazy" && !img.complete) await new Promise((res) => setTimeout(res, 600));
        if (!(img.complete && img.naturalWidth > 0)) bad.push(`not loaded: ${img.alt || img.src.slice(-40)}`);
        const clip = img.closest(".reveal-clip");
        if (clip && !clip.classList.contains("is-in")) bad.push(`reveal stuck: ${img.alt}`);
      }
      return [...new Set(bad)].slice(0, 5);
    });

    let reduced = [];
    if (REDUCED) {
      reduced = await page.evaluate(() => {
        const out = [];
        if (document.querySelector(".pin-spacer")) out.push(`pins: ${document.querySelectorAll(".pin-spacer").length}`);
        for (const el of document.querySelectorAll("main h1, main h2, main p")) {
          let op = 1;
          for (let n = el; n && n !== document.body; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity);
          if (op < 0.5 && el.getBoundingClientRect().height > 0 && !el.closest("[aria-hidden=true]")) out.push(`hidden text: "${el.textContent.trim().slice(0, 30)}"`);
        }
        return [...new Set(out)].slice(0, 5);
      });
    }

    const notes = [];
    const expected = p.includes("does-not-exist") ? 404 : 200;
    if (status !== expected) notes.push(`status ${status}`);
    if (logs.length) notes.push(...[...new Set(logs)].slice(0, 5));
    if (layout.overflow > 0) notes.push(`overflow +${layout.overflow}px: ${layout.culprits.join(" | ")}`);
    if (layout.clipped.length) notes.push(...layout.clipped);
    notes.push(...imgs, ...reduced);
    if (notes.length) problems.push({ w, p, notes });
    console.log(`${notes.length ? "FAIL" : "ok  "} ${w} ${p}${notes.length ? "\n       " + notes.join("\n       ") : ""}`);
  }
  await ctx.close();
}
await browser.close();
console.log(problems.length ? `${problems.length} route/width combination(s) with problems` : "all routes clean");
