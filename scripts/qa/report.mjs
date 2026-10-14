/**
 * Builds qa/index.html: every screenshot and scroll video from capture.mjs,
 * grouped by moment, plus the Lighthouse summary. Open it locally in a browser.
 *   node scripts/qa/report.mjs
 */
import fs from "node:fs";
import path from "node:path";

const QA = path.resolve("qa");
const has = (f) => fs.existsSync(path.join(QA, f));
const shots = (prefix) => fs.readdirSync(QA).filter((f) => f.startsWith(prefix) && f.endsWith(".png")).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const fps = has("report.json") ? JSON.parse(fs.readFileSync(path.join(QA, "report.json"), "utf8")) : [];
const lh = has("lighthouse/summary.json") ? JSON.parse(fs.readFileSync(path.join(QA, "lighthouse/summary.json"), "utf8")) : [];

const SECTIONS = [
  { title: "Home · Entry ritual", note: "First visit only, skippable. The line erodes; holding fills the rust ring over 1.2s and slows the erosion; four panels fold back to reveal the hero.", groups: ["gate-desktop", "gate-mobile"] },
  { title: "Home · The Monument (WebGL)", note: "Fold shader unfolds on load; scroll turns front → side → back with a noise dissolve; light cone + dust; OUTLIVED behind the figure (tone-on-tone, occluded by the garment).", groups: ["hero-turn-desktop", "hero-turn-mobile", "home-desktop", "home-mobile"] },
  { title: "Home · Manifesto, Era chapters, the Unfold, Next Era, footer", note: "Line-masked kinetic statements with velocity stretch; chapter card unfolds; pinned page stack turns on its left edge (swipe carousel on phones); the Unfold flattens 5 creased strips; Era 03 waitlist; reactive footer letters.", groups: ["home-lower-desktop", "home-lower-mobile"] },
  { title: "Fallbacks", note: "lite = no WebGL (weak GPU, Save-Data, battery saver, or measured < 40fps): CSS crossfade. static = prefers-reduced-motion: still image, no pin.", groups: ["home-lite-desktop", "home-lite-mobile", "home-static-desktop", "home-static-mobile"] },
  { title: "Vault", note: "Editorial grid with scale changes, clip reveals, velocity skew, liquid hover (desktop), swipe views (phones), rust unit counters.", groups: ["vault-desktop", "vault-mobile", "filter-desktop", "filter-mobile"] },
  { title: "Product · The Exhibit", note: "Drag with inertia, snapping to views; construction hotspots on the folds; 2.5× fabric loupe; calm buy column; sticky buy bar on phones.", groups: ["product-desktop", "product-mobile"] },
  { title: "Bag", note: "0/10 animation. Re-priced via the commerce adapter; checkout returns the “coming soon” state.", groups: ["bag-desktop", "bag-mobile"] },
  { title: "Evidence", note: "Lookbook film stills (product panoramas as placeholders), fold-in Era titles, every still links to its piece.", groups: ["evidence-desktop", "evidence-mobile"] },
  { title: "Manifesto", note: "Eight statements revealed word by word, one product interlude, CTA back to the Vault.", groups: ["manifesto-desktop", "manifesto-mobile"] },
  { title: "Page transition", note: "Fold wipe: two panels hinge closed and open (≤ 650ms). Shared-element transition is used for card → product instead.", groups: ["transition-desktop", "transition-mobile"] },
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const fpsOf = (g) => fps.find((r) => r.scenario === g);

const body = SECTIONS.map((s) => {
  const groups = s.groups
    .map((g) => {
      const imgs = shots(`${g}-`);
      if (!imgs.length && !has(`${g}.webm`)) return "";
      const f = fpsOf(g);
      const meta = f ? `${f.fps.avg} fps · ${f.errors.length} console errors` : "";
      return `<div class="group ${g.includes("mobile") ? "mobile" : "desktop"}">
        <p class="mono">${esc(g)}${meta ? ` · ${meta}` : ""}</p>
        <div class="row">
          ${has(`${g}.webm`) ? `<video src="${g}.webm" controls muted loop playsinline preload="metadata"></video>` : ""}
          ${imgs.map((i) => `<a href="${i}" target="_blank"><img src="${i}" alt="${esc(i)}" loading="lazy"></a>`).join("")}
        </div>
      </div>`;
    })
    .join("");
  return `<section><h2>${esc(s.title)}</h2><p class="note">${esc(s.note)}</p>${groups}</section>`;
}).join("");

const lhTable = lh.length
  ? `<table><thead><tr><th>Page</th><th>Perf</th><th>A11y</th><th>Best pr.</th><th>SEO</th><th>LCP</th><th>TBT</th><th>CLS</th></tr></thead><tbody>${lh
      .map((r) => `<tr><td>${esc(r.page)}</td><td>${r.perf}</td><td>${r.a11y}</td><td>${r.bp}</td><td>${r.seo}</td><td>${r.lcp}</td><td>${r.tbt}</td><td>${r.cls}</td></tr>`)
      .join("")}</tbody></table><p class="note">Lighthouse 13 mobile (simulated mid-range phone, slow 4G). Bag SEO is 60 by design: it is noindex.</p>`
  : "";

const html = `<!doctype html>
<html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OUTLIVED QA</title>
<style>
:root{--ink:#0b0b0a;--ink-2:#151513;--bone:#ece6da;--ash:#8a867e;--line:#2a2925;--rust:#b4532a}
*{box-sizing:border-box}body{margin:0;background:var(--ink);color:var(--bone);font:15px/1.5 system-ui,sans-serif;padding:24px 16px 80px}
h1{font-size:clamp(40px,8vw,96px);letter-spacing:-.05em;line-height:.9;margin:0 0 8px;text-transform:uppercase}
h2{font-size:28px;letter-spacing:-.02em;text-transform:uppercase;margin:56px 0 4px;border-top:1px solid var(--line);padding-top:24px}
.note{color:var(--ash);max-width:70ch;margin:0 0 16px}.mono{font:11px/1.5 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--ash);margin:18px 0 8px}
.row{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px}.row img,.row video{display:block;border:1px solid var(--line);background:var(--ink-2)}
.desktop img,.desktop video{height:260px;width:auto}.mobile img,.mobile video{height:360px;width:auto}
table{border-collapse:collapse;margin-top:16px}td,th{border-bottom:1px solid var(--line);padding:8px 14px;text-align:left;font:13px ui-monospace,monospace}th{color:var(--ash)}
</style></head><body>
<h1>Outlived · QA</h1><p class="note">Captured with Playwright on the production build at 1440×900 and 390×844 (real GPU). Click any still to open it full size.</p>
${lhTable}${body}
</body></html>`;

fs.writeFileSync(path.join(QA, "index.html"), html);
console.log("qa/index.html written");
