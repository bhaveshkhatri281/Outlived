/**
 * Fix 3 check: the line is readable for ≥2.5s, erosion is slow and capped,
 * early release drains smoothly with a hint, Space/Enter hold works, and on a
 * phone long-press doesn't select text or open a menu.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3001";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const LINE = "MOST THINGS DON'T LAST.";
const browser = await chromium.launch();
const issues = [];
const watch = (p) => p.on("console", (m) => ["error", "warning"].includes(m.type()) && !/DevTools|Fast Refresh|THREE.Clock/.test(m.text()) && issues.push(m.text().slice(0, 200)));
const lineText = (p) => p.evaluate(() => document.querySelector('[aria-label="Welcome to OUTLIVED"] p span[aria-hidden]')?.textContent ?? "");
const hold = (p) => p.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue("--hold") || 0));
const gateUp = (p) => p.evaluate(() => !!document.querySelector('[aria-label="Welcome to OUTLIVED"]'));

// ── Desktop: readability timeline, drain, hint, keyboard ──────────────
const page = await (await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } })).newPage();
watch(page);
await page.goto(BASE + "/?gate=1", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[aria-label="Welcome to OUTLIVED"]');
const t0 = Date.now();
const samples = [];
while (Date.now() - t0 < 8200) {
  const txt = await lineText(page);
  const intact = [...LINE].filter((c, i) => c !== " " && txt[i] === c).length;
  samples.push({ t: Date.now() - t0, intact });
  await page.waitForTimeout(250);
}
const letters = [...LINE].filter((c) => c !== " ").length;
const fullFrom = samples.find((s) => s.intact === letters)?.t ?? null;
const lastFull = [...samples].reverse().find((s) => s.intact === letters)?.t ?? null;
const minIntact = Math.min(...samples.slice(-6).map((s) => s.intact));

// Early release → smooth drain + hint
const btn = page.getByRole("button", { name: "Hold to enter" });
const box = await btn.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForTimeout(600);
const heldTo = await hold(page);
await page.mouse.up();
const drain = [];
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(90);
  drain.push(+(await hold(page)).toFixed(2));
}
const hintVisible = await page.evaluate(() => getComputedStyle(document.getElementById("gate-hint")).opacity);
await page.screenshot({ path: "qa/fix3-keep-holding.png" });

// Keyboard: hold Space for 1.4s on the focused button → gate opens
await btn.focus();
const focusRing = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
await page.keyboard.down("Space");
await page.waitForTimeout(1400);
await page.keyboard.up("Space");
await page.waitForTimeout(1600);
const spaceOpened = !(await gateUp(page));

// Enter works the same way
await page.goto(BASE + "/?gate=1", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[aria-label="Welcome to OUTLIVED"]');
await page.getByRole("button", { name: "Hold to enter" }).focus();
await page.keyboard.down("Enter");
await page.waitForTimeout(1400);
await page.keyboard.up("Enter");
await page.waitForTimeout(1600);
const enterOpened = !(await gateUp(page));

// ── Phone: long-press hold completes, no selection / context menu ─────
const phoneCtx = await browser.newContext({ userAgent: UA.replace("Windows NT 10.0; Win64; x64", "Linux; Android 14; Pixel 8") + " Mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const phone = await phoneCtx.newPage();
watch(phone);
await phone.goto(BASE + "/?gate=1", { waitUntil: "domcontentloaded" });
await phone.waitForSelector('[aria-label="Welcome to OUTLIVED"]');
const pbox = await phone.getByRole("button", { name: "Hold to enter" }).boundingBox();
const cdp = await phoneCtx.newCDPSession(phone);
const pt = { x: pbox.x + pbox.width / 2, y: pbox.y + pbox.height / 2 };
const css = await phone.evaluate(() => {
  const b = document.querySelector('[aria-label="Hold to enter"]');
  const s = getComputedStyle(b);
  return { touchAction: s.touchAction, userSelect: s.userSelect, callout: s.webkitTouchCallout ?? s.getPropertyValue("-webkit-touch-callout") };
});
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
await phone.waitForTimeout(1500);
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await phone.waitForTimeout(400);
const selection = await phone.evaluate(() => String(getSelection()));
await phone.waitForTimeout(1300);
const touchOpened = !(await gateUp(phone));

console.log(
  JSON.stringify(
    { fullyReadableFrom: fullFrom, stillFullyReadableAt: lastFull, readableForMs: lastFull - fullFrom, intactAt8s: `${minIntact}/${letters}`, heldTo: +heldTo.toFixed(2), drain, hintOpacity: hintVisible, focusRing, spaceOpened, enterOpened, phoneCss: css, selection, touchOpened, issues },
    null,
    2,
  ),
);
await browser.close();
