/** Checklist 5: waitlist validation, success state, and double submit. */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("outlived:entered", "1");
  } catch {}
});
const page = await ctx.newPage();
const issues = [];
page.on("console", (m) => m.type() === "error" && issues.push(m.text().slice(0, 160)));
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const input = page.locator("#waitlist-phone");
await input.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
const submit = page.getByRole("button", { name: "Join the waitlist" });

await input.fill("12345");
await submit.click();
await page.waitForTimeout(300);
const invalid = { error: await page.locator("#waitlist-msg").innerText(), ariaInvalid: await input.getAttribute("aria-invalid") };

await input.fill("98765 43210");
await submit.dblclick(); // two quick submits
await page.waitForTimeout(600);
const success = await page.getByRole("status").filter({ hasText: "We'll message" }).innerText().catch(() => null);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("outlived-waitlist") ?? "[]").length);
await page.screenshot({ path: "qa/waitlist-success.png" });
console.log(JSON.stringify({ invalid, success, storedEntries: stored, issues }));
await browser.close();
