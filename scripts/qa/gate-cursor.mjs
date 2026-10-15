/** Fix 2 check: the gate always has a visible cursor, and the HOLD ring mirrors progress. */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3001";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const browser = await chromium.launch();
const page = await (await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } })).newPage();
const issues = [];
page.on("console", (m) => ["error", "warning"].includes(m.type()) && !/DevTools|Fast Refresh|THREE.Clock/.test(m.text()) && issues.push(m.text().slice(0, 200)));
await page.goto(BASE + "/?gate=1", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);

const state = () =>
  page.evaluate(() => {
    const ring = document.querySelector(".cursor-ring");
    const layer = document.querySelector(".cursor-layer");
    const gate = document.querySelector('[aria-label="Welcome to OUTLIVED"]');
    const btn = document.querySelector('[aria-label="Hold to enter"]');
    return {
      systemCursorHidden: document.documentElement.classList.contains("has-cursor"),
      cursorZ: layer ? getComputedStyle(layer).zIndex : null,
      gateZ: gate ? getComputedStyle(gate).zIndex : null,
      ringMode: ring?.getAttribute("data-mode") ?? null,
      label: document.querySelector(".cursor-label")?.textContent ?? null,
      hold: layer ? getComputedStyle(layer).getPropertyValue("--hold") : null,
      btnTransform: btn ? getComputedStyle(btn).transform : null,
      baseStroke: btn ? getComputedStyle(btn.querySelector("circle")).stroke : null,
    };
  });

const before = await state();
await page.mouse.move(300, 300);
await page.waitForTimeout(300);
const afterMove = await state();
const box = await page.getByRole("button", { name: "Hold to enter" }).boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
await page.waitForTimeout(500);
const hovering = await state();
await page.screenshot({ path: "qa/fix2-gate-hover.png" });
await page.mouse.down();
await page.waitForTimeout(550);
const holding = await state();
await page.screenshot({ path: "qa/fix2-gate-holding.png" });
await page.mouse.up();
console.log(JSON.stringify({ before, afterMove, hovering, holding, issues }, null, 2));
await browser.close();
