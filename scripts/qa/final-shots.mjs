/** Review screenshots at 390 and 1440: gate, home hero, manifesto, Unfold, Vault, product page. */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = "qa/final";
fs.mkdirSync(OUT, { recursive: true });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });

for (const w of [390, 1440]) {
  const mobile = w < 768;
  const opts = {
    viewport: { width: w, height: mobile ? 844 : 900 },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: mobile ? UA.replace("Windows NT 10.0; Win64; x64", "Linux; Android 14; Pixel 8") + " Mobile" : UA,
  };

  // 1. Gate (fresh session), line fully readable; desktop: cursor over the button ("HOLD" ring).
  {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForSelector('[aria-label="Welcome to OUTLIVED"]');
    if (!mobile) {
      await page.mouse.move(300, 300);
      const b = await page.getByRole("button", { name: "Hold to enter" }).boundingBox();
      await page.mouse.move(b.x + b.width / 2 + 6, b.y + b.height / 2 + 4, { steps: 10 });
    }
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}/1-gate-${w}.png` });
    await ctx.close();
  }

  // 2–6: in an entered session.
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("outlived:entered", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  const scrollTo = async (y) => {
    const from = await page.evaluate(() => scrollY);
    const steps = Math.max(1, Math.round(Math.abs(y - from) / 120));
    for (let i = 1; i <= steps; i++) {
      await page.evaluate((v) => window.scrollTo(0, v), Math.round(from + ((y - from) * i) / steps));
      await page.waitForTimeout(25);
    }
    await page.waitForTimeout(1400);
  };
  const topOf = (sel) => page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY), sel);

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  if (!mobile) await page.mouse.move(w / 2, 450);
  await page.waitForTimeout(3200);
  await page.screenshot({ path: `${OUT}/2-hero-${w}.png` });

  const statements = await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Manifesto"] h2')].map((h) => Math.round(h.getBoundingClientRect().top + scrollY)));
  await scrollTo(statements[1] - (mobile ? 360 : 380));
  await page.screenshot({ path: `${OUT}/3-manifesto-${w}.png` });

  const unfold = await topOf('section[aria-labelledby="unfold-title"]');
  await scrollTo(unfold - (mobile ? 300 : 340)); // ~35–60% through the scrub: creases clearly visible
  await page.screenshot({ path: `${OUT}/4-unfold-creased-${w}.png` });
  await scrollTo(unfold + (mobile ? -60 : 150)); // scrub complete: flat close-up fills the frame
  await page.screenshot({ path: `${OUT}/4-unfold-flat-${w}.png` });

  await page.goto(BASE + "/vault", { waitUntil: "networkidle" });
  if (!mobile) await page.mouse.move(w / 2, 450);
  await page.waitForTimeout(1200);
  await scrollTo((await topOf("[data-flip-id]")) - (mobile ? 130 : 140));
  await page.screenshot({ path: `${OUT}/5-vault-${w}.png` });

  await page.goto(BASE + "/vault/book-jacket-wrap", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/6-product-${w}.png` });
  await ctx.close();
}
await browser.close();
console.log(fs.readdirSync(OUT).sort().join("\n"));
