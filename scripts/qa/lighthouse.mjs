/**
 * Lighthouse mobile pass (simulated mid-range phone on 4G) against a production server.
 *   npx next start -p 3100 &   node scripts/qa/lighthouse.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const PAGES = (process.argv[3] ?? "/,/vault,/vault/book-jacket-wrap,/bag,/evidence,/manifesto").split(",");
const OUT = path.resolve("qa/lighthouse");
fs.mkdirSync(OUT, { recursive: true });

const rows = [];
for (const p of PAGES) {
  const name = p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "-");
  const file = path.join(OUT, `${name}.json`);
  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "--yes",
      "lighthouse@13.5.0",
      BASE + p,
      `--chrome-path=${chromium.executablePath()}`,
      "--chrome-flags=--headless=new --use-angle=d3d11",
      "--only-categories=performance,accessibility,best-practices,seo",
      "--output=json",
      `--output-path=${file}`,
      "--quiet",
    ],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  const r = JSON.parse(fs.readFileSync(file, "utf8"));
  const s = (k) => Math.round(r.categories[k].score * 100);
  const a = r.audits;
  rows.push({
    page: p,
    perf: s("performance"),
    a11y: s("accessibility"),
    bp: s("best-practices"),
    seo: s("seo"),
    lcp: a["largest-contentful-paint"].displayValue,
    tbt: a["total-blocking-time"].displayValue,
    cls: a["cumulative-layout-shift"].displayValue,
    tti: a["interactive"]?.displayValue,
    failing: Object.values(a)
      .filter((x) => x.score !== null && x.score < 0.9 && ["binary", "numeric"].includes(x.scoreDisplayMode) && !["largest-contentful-paint", "total-blocking-time", "speed-index", "first-contentful-paint", "interactive", "cumulative-layout-shift", "max-potential-fid"].includes(x.id))
      .map((x) => x.id)
      .slice(0, 8),
  });
}
console.table(rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "failing"))));
for (const r of rows) if (r.failing.length) console.log(`${r.page}: ${r.failing.join(", ")}`);
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(rows, null, 2));
