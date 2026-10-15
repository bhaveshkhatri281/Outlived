/** Cutout review screenshots (390 + 1440): home hero, one Vault card, product page. Logs console errors. */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = "qa/cutout";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const errors = [];
for (const w of [390, 1440]) {
  const mobile = w < 768;
  const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("outlived:entered", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push(`${w} ${page.url()}: ${m.text().slice(0, 200)}`));
  page.on("pageerror", (e) => errors.push(`${w} ${page.url()}: ${e.message.slice(0, 200)}`));
  const go = async (path) => {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    if (!mobile) await page.mouse.move(w - 40, 450);
    await page.waitForTimeout(3000);
  };
  const scrollTo = async (y) => {
    const from = await page.evaluate(() => scrollY);
    const steps = Math.max(1, Math.round(Math.abs(y - from) / 120));
    for (let i = 1; i <= steps; i++) {
      await page.evaluate((v) => window.scrollTo(0, v), Math.round(from + ((y - from) * i) / steps));
      await page.waitForTimeout(25);
    }
    await page.waitForTimeout(1500);
  };
  const topOf = (sel) => page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY), sel);
  const shot = (name) => page.screenshot({ path: `${OUT}/${name}-${w}.png` });

  await go("/");
  await shot("1-hero");
  await go("/vault");
  await scrollTo((await topOf("[data-flip-id]")) - (mobile ? 130 : 140));
  await shot("2-vault-card");
  await go("/vault/book-jacket-wrap");
  await shot("3-product");
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no console errors");
console.log(fs.readdirSync(OUT).sort().join("\n"));
