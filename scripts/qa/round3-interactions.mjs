/**
 * Round 3 interaction checks (the ones not covered by gate-*, bag-flow, waitlist-test):
 *  - cart: remove, persists after reload, empty state
 *  - menu (390): opens, Escape closes and returns focus, every link navigates
 *  - keyboard: Tab focus is visible on links/buttons (1440)
 *  - product viewer: drag (1440) and swipe (390) turn front → side → back, hotspots
 *    open/close, size guide opens, closes with the button and with Escape
 *  - shopping path (1440): home → Vault → card → product → back, three times, with no
 *    console warnings (e.g. a wasted image preload when a larger copy is already cached)
 *   node scripts/qa/round3-interactions.mjs [base]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PRODUCT = "/vault/book-jacket-wrap";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const issues = [];
const log = (k, v) => console.log(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
const check = (ok, msg) => (ok ? null : issues.push(msg));

async function context(w) {
  const mobile = w < 768;
  const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("outlived:entered", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => issues.push(`pageerror ${w}: ${e.message.slice(0, 160)}`));
  return { ctx, page };
}

// ── Cart: remove, persistence, empty state ─────────────────────────────
{
  const { ctx, page } = await context(1440);
  await page.goto(BASE + PRODUCT, { waitUntil: "networkidle" });
  await page.locator('label:has(input[name="size"])').filter({ hasText: /^M$/ }).first().click();
  await page.getByRole("button", { name: /add to bag/i }).first().click();
  await page.waitForTimeout(500);
  await page.goto(BASE + "/bag", { waitUntil: "networkidle" });
  const before = await page.locator('[aria-label="Items in your bag"] > li').count();
  await page.reload({ waitUntil: "networkidle" });
  const afterReload = await page.locator('[aria-label="Items in your bag"] > li').count();
  const label = await page.locator('a[aria-label^="Bag"]').first().getAttribute("aria-label");
  await page.getByRole("button", { name: "Remove" }).first().click();
  await page.waitForTimeout(600);
  const empty = await page.getByText("Nothing recovered yet.").isVisible().catch(() => false);
  const labelAfter = await page.locator('a[aria-label^="Bag"]').first().getAttribute("aria-label");
  await page.reload({ waitUntil: "networkidle" });
  const emptyAfterReload = await page.getByText("Nothing recovered yet.").isVisible().catch(() => false);
  log("cart", { before, afterReload, label, empty, labelAfter, emptyAfterReload });
  check(before === 1 && afterReload === 1, "cart: line not persisted after reload");
  check(label === "Bag, 1 item", `cart: header label "${label}"`);
  check(empty && emptyAfterReload, "cart: empty state missing after remove");
  check(labelAfter === "Bag, 0 items", `cart: header label after remove "${labelAfter}"`);
  await ctx.close();
}

// ── Menu (phone) ───────────────────────────────────────────────────────
{
  const { ctx, page } = await context(390);
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const toggle = page.locator('button[aria-controls="site-menu"]');
  await toggle.click();
  await page.waitForTimeout(300);
  const opened = await page.locator("#site-menu").isVisible();
  const focusInMenu = await page.evaluate(() => !!document.activeElement?.closest("#site-menu"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const closedByEsc = !(await page.locator("#site-menu").isVisible().catch(() => false));
  const focusBack = await page.evaluate(() => document.activeElement?.getAttribute("aria-controls") === "site-menu");
  const links = [];
  for (const href of ["/vault", "/evidence", "/manifesto", "/bag"]) {
    await toggle.click();
    await page.waitForTimeout(250);
    await page.locator(`#site-menu a[href="${href}"]`).click();
    await page.waitForURL((u) => u.pathname === href, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(700);
    links.push({ href, ok: new URL(page.url()).pathname === href, menuClosed: !(await page.locator("#site-menu").isVisible().catch(() => false)) });
  }
  log("menu", { opened, focusInMenu, closedByEsc, focusBack, links });
  check(opened && focusInMenu, "menu: does not open or focus is not moved into it");
  check(closedByEsc, "menu: Escape does not close it");
  check(focusBack, "menu: focus not returned to the Menu button after Escape");
  for (const l of links) check(l.ok && l.menuClosed, `menu: link ${l.href} failed (ok=${l.ok}, closed=${l.menuClosed})`);
  await ctx.close();
}

// ── Keyboard focus visible (desktop) ───────────────────────────────────
{
  const { ctx, page } = await context(1440);
  await page.goto(BASE + PRODUCT, { waitUntil: "networkidle" });
  const seen = [];
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Tab");
    const f = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
      return { what: `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 24)}"`, ring };
    });
    if (f) seen.push(f);
  }
  const noRing = seen.filter((f) => !f.ring).map((f) => f.what);
  log("focus", { tabbed: seen.length, noRing: [...new Set(noRing)] });
  check(noRing.length === 0, `focus: no visible ring on ${[...new Set(noRing)].join(", ")}`);
  await ctx.close();
}

// ── Product viewer ─────────────────────────────────────────────────────
for (const w of [1440, 390]) {
  const { ctx, page } = await context(w);
  await page.goto(BASE + PRODUCT, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const stage = page.locator('[aria-roledescription="turnaround viewer"]');
  const box = await stage.boundingBox();
  const label = () => stage.getAttribute("aria-label");
  const views = [await label()];
  for (let i = 0; i < 2; i++) {
    const y = box.y + box.height * 0.45;
    if (w < 768) {
      // Touch swipe right-to-left via CDP touch events.
      const cdp = await ctx.newCDPSession(page);
      const pts = (x) => [{ x, y }];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(box.x + box.width * 0.8) });
      for (let k = 1; k <= 8; k++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(box.x + box.width * (0.8 - k * 0.07)) });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.mouse.move(box.x + box.width * 0.8, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.25, y, { steps: 10 });
      await page.mouse.up();
    }
    await page.waitForTimeout(1200);
    views.push(await label());
  }
  const turned = views.map((v) => /, (front|side|back) view/.exec(v ?? "")?.[1]);
  // Hotspots: back to the front view with the keyboard, then open/close the first one.
  for (let k = 0; k < 3 && !/, front view/.test((await label()) ?? ""); k++) {
    await stage.focus();
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(1100);
  }
  const spot = page.locator("[data-hotspot] button").first();
  let hotspot = "none";
  if (await spot.count()) {
    await spot.click();
    await page.waitForTimeout(400);
    const opened = (await spot.getAttribute("aria-expanded")) === "true";
    await spot.click();
    await page.waitForTimeout(400);
    const closed = (await spot.getAttribute("aria-expanded")) === "false";
    hotspot = { opened, closed };
    check(opened && closed, `viewer ${w}: hotspot open/close failed ${JSON.stringify(hotspot)}`);
  } else issues.push(`viewer ${w}: no hotspots on front view`);
  // Size guide modal.
  await page.getByRole("button", { name: /size guide/i }).first().click();
  await page.waitForTimeout(400);
  const dialog = page.locator('dialog[aria-labelledby="size-guide-title"]');
  const sgOpen = await dialog.evaluate((d) => d.open);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const sgEsc = !(await dialog.evaluate((d) => d.open));
  await page.getByRole("button", { name: /size guide/i }).first().click();
  await page.waitForTimeout(300);
  await dialog.getByRole("button", { name: /close/i }).first().click();
  await page.waitForTimeout(300);
  const sgBtn = !(await dialog.evaluate((d) => d.open));
  log(`viewer ${w}`, { turned, hotspot, sizeGuide: { open: sgOpen, escape: sgEsc, button: sgBtn } });
  check(turned.join() === "front,side,back", `viewer ${w}: ${w < 768 ? "swipe" : "drag"} turned ${turned.join(" → ")}`);
  check(sgOpen && sgEsc && sgBtn, `viewer ${w}: size guide open/close failed`);
  await ctx.close();
}

// ── Shopping path: client-side navigation, console must stay quiet ──────
{
  const { ctx, page } = await context(1440);
  const warns = [];
  page.on("console", (m) => (m.type() === "warning" || m.type() === "error") && warns.push(`${new URL(page.url()).pathname}: ${m.text().slice(0, 120)}`));
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 900) await page.evaluate((v) => scrollTo(0, v), y);
  await page.waitForTimeout(1500);
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator('header a[href="/vault"]').first().click();
  await page.waitForURL("**/vault");
  await page.waitForTimeout(2000);
  for (const slug of ["air-bell", "air-bloom", "envelope-basin"]) {
    await page.evaluate((s) => document.querySelector(`a[href="/vault/${s}"]`)?.scrollIntoView({ block: "center" }), slug);
    await page.waitForTimeout(900);
    await page.locator(`a[href="/vault/${slug}"][data-shared]`).first().click();
    await page.waitForURL(`**/vault/${slug}`);
    await page.waitForTimeout(5000);
    await page.goBack();
    await page.waitForURL("**/vault");
    await page.waitForTimeout(1500);
  }
  log("shopping path", { warnings: warns.length });
  for (const w of [...new Set(warns)]) issues.push(`console on shopping path: ${w}`);
  await ctx.close();
}

await browser.close();
console.log(issues.length ? `ISSUES:\n  ${issues.join("\n  ")}` : "no issues");
