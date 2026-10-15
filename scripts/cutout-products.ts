/**
 * Cuts each product view out of its studio backdrop:
 * /public/products/<slug>/{front,side,back}.webp → {front,side,back}-cut.webp
 * (transparent background, alpha kept, quality 90). Same canvas size as the
 * source, so cutouts line up with the originals for crossfades. Every run
 * rewrites data/cutouts.json (which views have a cutout); the site falls back
 * to the original photo for any view missing from it.
 *
 * Segmentation runs in Python (scripts/cutout_mask.py, rembg + BiRefNet):
 * @imgly/background-removal-node was tried first and dropped dark jeans and
 * mesh on back and side views. One-time setup:
 *   python -m venv .venv-cutout
 *   .venv-cutout/Scripts/pip install "rembg[cpu]"     (macOS/Linux: .venv-cutout/bin/pip)
 * The model (~200 MB) downloads to ~/.u2net on first run.
 * Set CUTOUT_PYTHON to use another interpreter.
 *
 *   npm run cutout:sample         2 images + review sheets in .cutout-preview/
 *   npm run cutout                every image (skips ones already cut)
 *
 * Options (after `--`):
 *   --sample <n>     process n views and write review sheets (ink + red backdrops)
 *   --only <slugs>   comma-separated slugs
 *   --force          redo cutouts that already exist
 *
 * Runs on Node ≥ 22.18 with built-in TypeScript stripping (no extra tooling).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const PRODUCTS = path.join(ROOT, "public/products");
const PREVIEW = path.join(ROOT, ".cutout-preview");
const VIEWS = ["front", "side", "back"] as const;

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : (process.argv[i + 1] ?? "");
}
const sample = arg("sample") ? Number(arg("sample")) : 0;
const only = arg("only")?.split(",").filter(Boolean);
const force = process.argv.includes("--force") || sample > 0;

function python() {
  if (process.env.CUTOUT_PYTHON) return process.env.CUTOUT_PYTHON;
  for (const p of [".venv-cutout/Scripts/python.exe", ".venv-cutout/bin/python"]) {
    if (fs.existsSync(path.join(ROOT, p))) return path.join(ROOT, p);
  }
  return "python";
}

const slugs = fs
  .readdirSync(PRODUCTS)
  .filter((s) => fs.statSync(path.join(PRODUCTS, s)).isDirectory())
  .filter((s) => !only || only.includes(s));

let jobs = slugs.flatMap((slug) => VIEWS.map((view) => ({ slug, view })));
if (sample) jobs = jobs.filter((_, i) => i % 3 === 0).slice(0, sample); // front views
jobs = jobs.filter(({ slug, view }) => {
  const dir = path.join(PRODUCTS, slug);
  return fs.existsSync(path.join(dir, `${view}.webp`)) && (force || !fs.existsSync(path.join(dir, `${view}-cut.webp`)));
});

if (jobs.length) {
  // Segment everything in one Python process (the model loads once), then encode here.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "outlived-cutout-"));
  const srcs = jobs.map(({ slug, view }) => path.join(PRODUCTS, slug, `${view}.webp`));
  const run = spawnSync(python(), ["-I", path.join(ROOT, "scripts/cutout_mask.py"), tmp, ...srcs], { stdio: ["ignore", "ignore", "inherit"] });
  if (run.status !== 0) {
    console.error(`Segmentation failed (${run.error?.message ?? `exit ${run.status}`}). See the setup notes at the top of this file.`);
    process.exit(1);
  }
  if (sample) fs.mkdirSync(PREVIEW, { recursive: true });

  for (const [i, { slug, view }] of jobs.entries()) {
    const cut = path.join(tmp, `${i}.png`);
    await sharp(cut)
      .webp({ quality: 90, alphaQuality: 100, effort: 6 })
      .toFile(path.join(PRODUCTS, slug, `${view}-cut.webp`));
    console.log(`${slug}/${view}-cut.webp`);

    if (sample) {
      const { width = 0, height = 0 } = await sharp(cut).metadata();
      for (const [name, background] of [
        ["ink", "#0e0e0d"],
        ["red", "#c0392b"],
      ] as const) {
        await sharp({ create: { width, height, channels: 4, background } })
          .composite([{ input: cut }])
          .png()
          .toFile(path.join(PREVIEW, `${slug}-${view}-${name}.png`));
      }
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Which views have a cutout (read by lib/images.ts).
const manifest: Record<string, string[]> = {};
for (const slug of fs.readdirSync(PRODUCTS).sort()) {
  const cut = VIEWS.filter((v) => fs.existsSync(path.join(PRODUCTS, slug, `${v}-cut.webp`)));
  if (cut.length) manifest[slug] = cut;
}
fs.writeFileSync(path.join(ROOT, "data/cutouts.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`${jobs.length} cutout(s) written${sample ? `, previews in ${path.relative(ROOT, PREVIEW)}` : ""}`);
