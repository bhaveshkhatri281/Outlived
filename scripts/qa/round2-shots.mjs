/** Round 2 review screenshots (390 + 1440): home hero, Vault card, Unfold, Evidence top + one exhibit, Manifesto title. */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = "qa/round2";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
for (const w of [390, 1440]) {
  const mobile = w < 768;
  const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("outlived:entered", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  const go = async (path) => {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    if (!mobile) await page.mouse.move(w / 2, 450);
    await page.waitForTimeout(2500);
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
  await shot("1-home-hero");
  const unfold = await topOf('section[aria-labelledby="unfold-title"]');
  await scrollTo(unfold + (mobile ? -60 : 40));
  await shot("3-unfold");

  await go("/vault");
  await scrollTo((await topOf("[data-flip-id]")) - (mobile ? 130 : 140));
  await shot("2-vault-card");

  await go("/evidence");
  await shot("4-evidence-top");
  await scrollTo((await topOf("figure:nth-of-type(2)")) - (mobile ? 90 : 110));
  await shot("5-evidence-exhibit");

  await go("/manifesto");
  await shot("6-manifesto-title");
  await ctx.close();
}
await browser.close();
console.log(fs.readdirSync(OUT).sort().join("\n"));
