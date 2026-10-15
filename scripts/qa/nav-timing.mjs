/**
 * Fix E check (run against `npm run start`): click → new URL time, and total wipe time,
 * for header links (1440) and menu links (390).
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch();
const results = [];
for (const w of [1440, 390]) {
  const mobile = w < 768;
  const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("outlived:entered", "1");
    } catch {}
    const mark = (k) => (window.__nav[k] = performance.now());
    window.__nav = {};
    document.addEventListener(
      "click",
      () => {
        window.__nav = {};
        mark("click");
        // Poll every frame for the wipe overlay (it mounts on click and unmounts when done).
        const poll = () => {
          const on = [...document.querySelectorAll("div.fixed")].some((d) => d.className.includes("z-[150]"));
          if (on) window.__nav.sawPanels = true;
          else if (window.__nav.sawPanels) return mark("done");
          if (performance.now() - window.__nav.click < 3000) requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
      },
      true,
    );
    for (const fn of ["pushState", "replaceState"]) {
      const orig = history[fn].bind(history);
      history[fn] = (...a) => {
        const before = location.pathname;
        const r = orig(...a);
        if (location.pathname !== before && window.__nav.click && !window.__nav.url) mark("url");
        return r;
      };
    }
    new MutationObserver(() => {
      const panels = document.querySelector('div.fixed.inset-0[class*="z-[150]"]');
      if (panels) window.__nav.sawPanels = true;
      else if (window.__nav.sawPanels && !window.__nav.done) mark("done");
    }).observe(document.documentElement, { childList: true, subtree: true });
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500); // let Next prefetch visible links
  const route = mobile ? ["Evidence", "Manifesto", "Vault"] : ["Evidence", "Manifesto", "Vault", "Evidence"];
  let from = "/";
  for (const label of route) {
    if (mobile) {
      await page.getByRole("button", { name: "Menu" }).click();
      await page.waitForTimeout(600); // menu open; its links prefetch
      await page.locator("#site-menu").getByRole("link", { name: new RegExp(label) }).click();
    } else {
      await page.locator("header nav").getByRole("link", { name: label, exact: true }).click();
    }
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__nav);
    results.push({ width: w, nav: `${from} → /${label.toLowerCase()}`, clickToUrlMs: Math.round(n.url - n.click), totalWipeMs: n.done ? Math.round(n.done - n.click) : "no wipe" });
    from = `/${label.toLowerCase()}`;
    await page.waitForTimeout(1200);
  }
  await ctx.close();
}
await browser.close();
console.table(results);
