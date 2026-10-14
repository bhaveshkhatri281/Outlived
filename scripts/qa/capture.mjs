/**
 * Quality loop capture (creative direction §"Quality loop").
 * For each scenario, at 1440×900 and 390×844: records a scroll-through video,
 * takes screenshots at 3 scroll positions, measures FPS while scrolling and
 * collects console errors. Output: qa/<scenario>-<viewport>.{webm,png} + qa/report.json
 *
 *   node scripts/qa/capture.mjs                       all scenarios against http://localhost:3000
 *   node scripts/qa/capture.mjs --only vault,product  some scenarios
 *   node scripts/qa/capture.mjs --base http://localhost:3100
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const BASE = opt("base") ?? "http://localhost:3000";
const OUT = path.resolve(opt("out") ?? "qa");
const ONLY = opt("only")?.split(",");
const VIEWPORTS = (opt("viewports") ?? "desktop,mobile").split(",");

/** Each scenario: a path, screenshot stops (fractions of the scrollable height) and optional steps. */
const SCENARIOS = [
  { name: "home", path: "/", stops: [0, 0.18, 0.42] },
  { name: "home-lower", path: "/", stops: [0.6, 0.8, 1] },
  { name: "vault", path: "/vault", stops: [0, 0.25, 0.6] },
  { name: "product", path: "/vault/book-jacket-wrap", stops: [0, 0.45, 1] },
  { name: "bag", path: "/bag", stops: [0, 0.5, 1], seedBag: true },
  { name: "evidence", path: "/evidence", stops: [0, 0.4, 0.8] },
  { name: "manifesto", path: "/manifesto", stops: [0, 0.4, 0.8] },
  {
    name: "hero-turn",
    path: "/",
    custom: async (page, shot) => {
      await page.waitForTimeout(600);
      await page.mouse.move(700, 450); // first interaction mounts the WebGL scene
      await page.waitForTimeout(2600);
      await shot("1");
      const pin = await page.evaluate(() => window.innerHeight * (window.innerWidth >= 768 ? 1.2 : 0.7));
      for (const f of [0.22, 0.5, 0.75]) {
        await page.evaluate((y) => window.scrollTo(0, y), Math.round(pin * f));
        await page.waitForTimeout(900);
        await shot(String(f).replace("0.", ""));
      }
    },
  },
  // Fallbacks: no WebGL (weak GPU / battery saver) and prefers-reduced-motion.
  { name: "home-lite", path: "/?motion=lite", stops: [0, 0.06, 0.12] },
  { name: "home-static", path: "/?motion=static", stops: [0, 0.2, 0.5] },
  {
    name: "gate",
    path: "/?gate=1",
    custom: async (page, shot) => {
      await page.waitForTimeout(600);
      await shot("1");
      await page.waitForTimeout(2600); // let the line erode
      await shot("2");
      const btn = page.getByRole("button", { name: "Hold to enter" });
      const box = await btn.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await shot("3"); // ring half full, erosion slowed
      await page.waitForTimeout(650);
      await page.mouse.up();
      await page.waitForTimeout(260);
      await shot("4"); // origami fold mid-way
      await page.waitForTimeout(1600);
      await shot("5"); // hero unfolding
    },
  },
  {
    name: "transition",
    path: "/vault",
    custom: async (page, shot) => {
      await page.waitForTimeout(800);
      await page.getByRole("link", { name: "Evidence" }).first().click();
      await page.waitForTimeout(150);
      await shot("1"); // panels closing
      await page.waitForTimeout(250);
      await shot("2"); // closed / route change
      await page.waitForTimeout(400);
      await shot("3"); // opened on Evidence
    },
  },
  {
    name: "filter",
    path: "/vault",
    custom: async (page, shot) => {
      await page.waitForTimeout(800);
      await page.evaluate(() => window.scrollTo(0, 420));
      await page.waitForTimeout(800);
      await shot("1");
      await page.getByRole("button", { name: /Era 02/ }).click();
      await page.waitForTimeout(300);
      await shot("2"); // Flip mid-move
      await page.waitForTimeout(900);
      await shot("3");
    },
  },
];

const VP = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const BAG = {
  state: {
    lines: [
      { id: "book-jacket-wrap:M", slug: "book-jacket-wrap", size: "M", qty: 1, snapshot: { name: "Book Jacket Wrap", code: "OTL-D07-35", category: "Hoodie", price: 7499, colorName: "Dusk Mauve", image: "/products/book-jacket-wrap/front.webp" } },
      { id: "air-bell:L", slug: "air-bell", size: "L", qty: 2, snapshot: { name: "Air Bell", code: "OTL-J08-01", category: "Jacket", price: 8499, colorName: "Lilac", image: "/products/air-bell/front.webp" } },
    ],
  },
  version: 1,
};

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: ["--use-angle=d3d11", "--enable-gpu-rasterization", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
  });
  const report = [];
  for (const sc of SCENARIOS.filter((s) => !ONLY || ONLY.includes(s.name))) {
    for (const vpName of VIEWPORTS) {
      const vp = VP[vpName];
      const tag = `${sc.name}-${vpName}`;
      const videoDir = path.join(OUT, ".video-tmp", tag);
      const context = await browser.newContext({ ...vp, recordVideo: { dir: videoDir, size: vp.viewport } });
      await context.addInitScript(
        ([bag, seed]) => {
          try {
            localStorage.setItem("outlived-entered", "1"); // skip the entry ritual
            localStorage.setItem("outlived-hint-turn", "");
            if (seed) localStorage.setItem("outlived-bag", JSON.stringify(bag));
          } catch {}
        },
        [BAG, !!sc.seedBag],
      );
      const page = await context.newPage();
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(BASE + sc.path, { waitUntil: sc.custom ? "domcontentloaded" : "networkidle" });
      if (!sc.custom) await page.waitForTimeout(1800);
      const renderer = await page.evaluate(() => {
        const gl = document.createElement("canvas").getContext("webgl");
        const ext = gl?.getExtension("WEBGL_debug_renderer_info");
        return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
      });

      // FPS counter while we scroll.
      await page.evaluate(() => {
        window.__frames = [];
        const tick = (t) => {
          window.__frames.push(t);
          window.__fpsRaf = requestAnimationFrame(tick);
        };
        window.__fpsRaf = requestAnimationFrame(tick);
      });

      const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const shots = [];
      if (sc.custom) {
        await sc.custom(page, async (label) => {
          const file = path.join(OUT, `${tag}-${label}.png`);
          await page.screenshot({ path: file });
          shots.push(path.basename(file));
        });
      }
      let current = 0;
      for (const [i, stop] of (sc.stops ?? []).entries()) {
        const target = Math.round(total * stop);
        // Scroll in wheel steps so Lenis / ScrollTrigger behave as with a real user.
        const step = vpName === "mobile" ? 90 : 120;
        while (Math.abs(target - current) > step) {
          const dy = target > current ? step : -step;
          await page.mouse.wheel(0, dy);
          current += dy;
          await page.waitForTimeout(16);
        }
        await page.evaluate((y) => window.scrollTo(0, y), target);
        current = target;
        await page.waitForTimeout(1400);
        const file = path.join(OUT, `${tag}-${i + 1}.png`);
        await page.screenshot({ path: file });
        shots.push(path.basename(file));
      }

      const fps = await page.evaluate(() => {
        cancelAnimationFrame(window.__fpsRaf);
        const f = window.__frames;
        const deltas = f.slice(1).map((t, i) => t - f[i]);
        const avg = deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
        const sorted = [...deltas].sort((a, b) => b - a);
        return { avg: Math.round(1000 / avg), p95frame: Math.round(sorted[Math.floor(sorted.length * 0.05)] ?? 0) };
      });

      await context.close();
      const vids = await fs.readdir(videoDir);
      const video = path.join(OUT, `${tag}.webm`);
      if (vids[0]) await fs.rename(path.join(videoDir, vids[0]), video);
      report.push({ scenario: tag, fps, renderer, errors, shots, video: path.basename(video) });
      console.log(`${tag.padEnd(22)} fps ${String(fps.avg).padStart(3)} (worst 5% frame ${fps.p95frame}ms)  errors ${errors.length}  ${renderer}`);
      errors.slice(0, 5).forEach((e) => console.log(`    ! ${e.slice(0, 200)}`));
    }
  }
  await browser.close();
  await fs.rm(path.join(OUT, ".video-tmp"), { recursive: true, force: true });
  await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
