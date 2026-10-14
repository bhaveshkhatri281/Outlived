/** Evaluates a JS expression on a page at 390px mobile and prints the result. */
import { chromium } from "playwright";

const [url = "http://localhost:3000/", expr = "document.title"] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem("outlived-entered", "1"));
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
console.log(JSON.stringify(await page.evaluate(expr), null, 2));
await browser.close();
