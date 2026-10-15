/** Checklist 7: add a product to the bag from its page, open the Bag, change the quantity. */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
for (const vp of [
  { name: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: "1440", viewport: { width: 1440, height: 900 } },
]) {
  const ctx = await browser.newContext(vp);
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("outlived:entered", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  const issues = [];
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && !/DevTools|Fast Refresh/.test(m.text()) && issues.push(m.text().slice(0, 160)));
  await page.goto(BASE + "/vault/book-jacket-wrap", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Add to Bag — / }).click();
  const needsSize = await page.getByRole("alert").filter({ hasText: "Choose a size" }).isVisible();
  await page.locator("label", { hasText: /^M$/ }).click();
  await page.getByRole("button", { name: /Add to Bag — / }).click();
  await page.waitForTimeout(400);
  const toast = await page.getByRole("status").innerText().catch(() => "");
  const bagLabel = await page.locator('header a[href="/bag"]').getAttribute("aria-label");
  await page.goto(BASE + "/bag", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const total = () => page.locator('aside[aria-label="Order summary"] dd').nth(1).innerText();
  const before = await total();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.waitForTimeout(200);
  const afterUp = await total();
  const qty = await page.locator('[role="group"][aria-label^="Quantity"] span').innerText();
  await page.getByRole("button", { name: "Decrease quantity" }).click();
  await page.waitForTimeout(200);
  const afterDown = await total();
  await page.screenshot({ path: `qa/checklist-bag-${vp.name}.png` });
  await page.getByRole("button", { name: "Checkout" }).click();
  await page.waitForTimeout(300);
  const checkout = await page.getByRole("heading", { name: /Checkout coming soon/i }).isVisible();
  console.log(JSON.stringify({ vp: vp.name, needsSizeFirst: needsSize, toast: toast.replace(/\s+/g, " ").trim(), bagLabel, before, afterUp, qty, afterDown, checkout, issues }));
  await ctx.close();
}
await browser.close();
