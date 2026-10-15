/**
 * Entry gate behaviour test (Fix 1): new tab shows it, reload doesn't, a new
 * tab (new session) shows it again, ?gate=1 always shows it. Uses a normal
 * desktop Chrome user agent (the gate is skipped for headless/bot agents).
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3001";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });
const warnings = [];
const gateUp = async (page) => {
  await page.waitForTimeout(900);
  return page.evaluate(() => !!document.querySelector('[aria-label="Welcome to OUTLIVED"]'));
};
const watch = (page) =>
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && !/DevTools|Fast Refresh|THREE.Clock/.test(m.text()) && warnings.push(m.text().slice(0, 200)));

const results = {};
let page = await ctx.newPage();
watch(page);
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
results.newTab = await gateUp(page);
await page.getByRole("button", { name: "Skip" }).click();
await page.waitForTimeout(1500);
results.afterSkip = await gateUp(page);
await page.reload({ waitUntil: "domcontentloaded" });
results.reload = await gateUp(page);
await page.goto(BASE + "/vault", { waitUntil: "domcontentloaded" });
results.otherPage = await gateUp(page);
await page.goto(BASE + "/?gate=1", { waitUntil: "domcontentloaded" });
results.forced = await gateUp(page);
await page.close();

// sessionStorage is per tab: a brand-new tab is a new visit.
page = await ctx.newPage();
watch(page);
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
results.secondNewTab = await gateUp(page);

// Storage blocked: the site still works.
const blocked = await browser.newContext({ userAgent: UA });
await blocked.addInitScript(() => {
  Object.defineProperty(window, "sessionStorage", { get() { throw new Error("blocked"); } });
  Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
});
const bp = await blocked.newPage();
const blockedErrors = [];
bp.on("pageerror", (e) => blockedErrors.push(String(e)));
await bp.goto(BASE + "/", { waitUntil: "domcontentloaded" });
results.blockedShowsGate = await gateUp(bp);
await bp.getByRole("button", { name: "Skip" }).click();
await bp.waitForTimeout(1500);
results.blockedSkipWorks = !(await gateUp(bp));
results.blockedPageErrors = blockedErrors.length;

console.log(JSON.stringify({ ...results, warnings }, null, 2));
await browser.close();
