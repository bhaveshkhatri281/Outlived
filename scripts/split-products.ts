/**
 * Splits product triptychs (≈1536×1024: FRONT | SIDE | BACK) from /raw-products
 * into /public/products/<slug>/{front,side,back}.{avif,webp} and records the
 * output size in data/image-manifest.json.
 *
 *   npm run split:sample          2 images + a review sheet in .split-preview/
 *   npm run split                 every image
 *
 * The source panels are NOT equal thirds: each file has two thin white divider
 * lines at different x positions, and the FRONT/SIDE/BACK labels are printed
 * over the legs at the bottom. So the script:
 *   1. finds both dividers per file (columns that are bright for ~the full height),
 *   2. centres a fixed-size window on the figure inside each panel,
 *   3. pads with the measured backdrop colour if a panel is narrower than the window,
 *   4. finds the label row (bright text on the same rows in all three panels,
 *      which jeans highlights never are) and cuts above it; if a file's labels
 *      sit higher than the standard height, the top is padded with backdrop.
 * Every output is the same size, so the three views line up for crossfades.
 *
 * Options (after `--`):
 *   --sample <n>     process n images and write .split-preview/sample-sheet.png
 *   --only <slugs>   comma-separated slugs, e.g. --only book-jacket-wrap,air-bell
 *   --height <px>    output height (default 968; files with higher labels are padded at the top)
 *   --width <px>     output width (default 520)
 *   --src <dir>      source folder (default: raw-products)
 *   --out <dir>      output folder (default: public/products)
 *   --dry            analyse and report, write nothing
 *
 * Runs on Node ≥ 22.18 with built-in TypeScript stripping (no extra tooling).
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import { EXCLUDED_NAMES, products } from "../data/products.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const VIEWS = ["front", "side", "back"] as const;
const CATEGORY: Record<string, string> = { HD: "Hoodie", SH: "Shacket", JK: "Jacket" };

const DIVIDER_LUM = 110; // a divider pixel is at least this bright
const DIVIDER_COVERAGE = 0.88; // ...for at least this share of the column's rows
const DIVIDER_INSET = 4; // px kept clear of a divider on each side
const FIGURE_DELTA = 26; // figure pixel = this much brighter or darker than the backdrop
const LABEL_LUM = [180, 150, 130]; // label text is light grey; some files print it dimmer
const LABEL_HALF_W = 70; // labels are centred in their panel, ~±50px wide
const LABEL_PAD = 10; // rows removed above the detected label

// ── CLI ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const sampleCount = opt("sample") ? Number(opt("sample")) : undefined;
const only = opt("only")?.split(",").map((s) => s.trim());
const OUT_W = Number(opt("width") ?? 520);
const OUT_H = Number(opt("height") ?? 968);
const srcDir = path.resolve(ROOT, opt("src") ?? "raw-products");
const outDir = path.resolve(ROOT, opt("out") ?? "public/products");
const dry = flag("dry");
const previewDir = path.join(ROOT, ".split-preview");
const manifestPath = path.join(ROOT, "data/image-manifest.json");

// ── Filename → product ─────────────────────────────────────────────────
// HD2_D07_M35_book_jacket_wrap.png → category HD, drop D07, model 35, "book jacket wrap"
// JK2_D08_F01_air_bell.png         → jackets use an F model prefix
const FILE_RE = /^([A-Z]{2})\d*_([A-Z]\d{2})_[A-Z](\d{2,3})_(.+)\.png$/i;

type Job = { file: string; code: string; slug: string; name: string; category: string; note?: string };
type Panel = { view: (typeof VIEWS)[number]; left: number; width: number; centre: number };
type Result = Job & { panels: Panel[]; dividers: number[]; cropH: number; labelTop: number | null; bytes: Record<string, number> };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const excludedSlugs = new Set(EXCLUDED_NAMES.map(slugify));

async function planJobs() {
  let entries: string[];
  try {
    entries = (await fs.readdir(srcDir)).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  } catch {
    console.error(`\n✗ No source folder at ${path.relative(ROOT, srcDir)}/. Copy the product PNGs there first.\n`);
    process.exit(1);
  }

  const jobs: Job[] = [];
  const skipped: { file: string; reason: string }[] = [];

  for (const file of entries) {
    const m = FILE_RE.exec(file);
    if (!m) {
      skipped.push({ file, reason: "filename doesn't match CAT_DROP_MODEL_name.png" });
      continue;
    }
    const [, cat, drop, model, rawName] = m;
    const fileCode = `OTL-${drop.toUpperCase()}-${model.padStart(2, "0")}`;
    const fileSlug = slugify(rawName.replace(/_/g, " "));
    if ([...excludedSlugs].some((s) => fileSlug.startsWith(s))) {
      skipped.push({ file, reason: "excluded by the brief" });
      continue;
    }
    // Match by name (codes collide across categories, e.g. D07-02 is a hoodie AND a shacket).
    // "air-bloom-finale" still matches "air-bloom".
    const category = CATEGORY[cat.toUpperCase()];
    const product =
      products.find((p) => p.slug === fileSlug) ??
      products.find((p) => fileSlug.startsWith(`${p.slug}-`) && (!category || p.category === category));
    if (!product) {
      skipped.push({ file, reason: `"${fileSlug}" is not in data/products.ts` });
      continue;
    }
    const notes: string[] = [];
    if (product.slug !== fileSlug) notes.push(`filename "${fileSlug}" → ${product.slug}`);
    if (product.code !== fileCode) notes.push(`filename code ${fileCode}, catalogue code ${product.code}`);
    if (category && category !== product.category) notes.push(`filename category ${cat} ≠ ${product.category}`);
    jobs.push({ file, code: product.code, slug: product.slug, name: product.name, category: product.category, note: notes.join("; ") || undefined });
  }

  let selected = only ? jobs.filter((j) => only.includes(j.slug)) : jobs;
  if (sampleCount) {
    // The hero piece plus a different category, so the sample covers more ground.
    const hero = selected.find((j) => j.slug === "book-jacket-wrap");
    const other = selected.find((j) => j !== hero && j.category !== hero?.category);
    selected = [hero, other, ...selected].filter((j, i, a): j is Job => !!j && a.indexOf(j) === i).slice(0, sampleCount);
  }
  return { jobs: selected, skipped };
}

// ── Analysis ───────────────────────────────────────────────────────────
async function analyse(file: string) {
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const lum = (x: number, y: number) => data[y * W + x];

  // Dividers: columns bright for nearly the whole height (garments never span top to bottom).
  const coverage = (x: number) => {
    let n = 0;
    for (let y = 0; y < H; y += 2) if (lum(x, y) > DIVIDER_LUM) n++;
    return n / Math.ceil(H / 2);
  };
  const findDivider = (from: number, to: number) => {
    let best = -1;
    let bestCov = DIVIDER_COVERAGE;
    for (let x = from; x < to; x++) {
      const c = coverage(x);
      if (c > bestCov) {
        bestCov = c;
        best = x;
      }
    }
    return best;
  };
  const d1 = findDivider(Math.round(W * 0.25), Math.round(W * 0.42));
  const d2 = findDivider(Math.round(W * 0.58), Math.round(W * 0.75));
  if (d1 < 0 || d2 < 0) throw new Error(`could not find both panel dividers (found ${d1}, ${d2})`);

  // Backdrop brightness: median of the top-left corner.
  const patch: number[] = [];
  for (let y = 8; y < 48; y++) for (let x = 8; x < 48; x++) patch.push(lum(x, y));
  patch.sort((a, b) => a - b);
  const bg = patch[patch.length >> 1];

  // Figure centre: mean x of pixels that differ from the backdrop (rows 8%–90%).
  const centreOf = (left: number, right: number) => {
    let sum = 0;
    let n = 0;
    for (let y = Math.round(H * 0.08); y < H * 0.9; y += 3)
      for (let x = left; x < right; x += 2)
        if (Math.abs(lum(x, y) - bg) > FIGURE_DELTA) {
          sum += x;
          n++;
        }
    return n ? Math.round(sum / n) : Math.round((left + right) / 2);
  };

  const bounds: [number, number][] = [
    [0, d1 - DIVIDER_INSET],
    [d1 + DIVIDER_INSET, d2 - DIVIDER_INSET],
    [d2 + DIVIDER_INSET, W],
  ];
  const panels: Panel[] = VIEWS.map((view, i) => {
    const [l, r] = bounds[i];
    return { view, left: l, width: r - l, centre: centreOf(l, r) };
  });

  // Label row: first row (bottom 12%) with light text near the centre of every panel.
  const hasText = (y: number, cx: number, min: number) => {
    let n = 0;
    for (let x = cx - LABEL_HALF_W; x < cx + LABEL_HALF_W; x++) if (lum(x, y) > min && ++n >= 2) return true;
    return false;
  };
  let labelTop: number | null = null;
  for (const min of LABEL_LUM) {
    for (let y = Math.round(H * 0.88); y < H && labelTop === null; y++)
      if (bounds.every(([l, r]) => hasText(y, Math.round((l + r) / 2), min))) labelTop = y;
    if (labelTop !== null) break;
  }
  // Backdrop colour (for padding): average RGB of the same corner patch.
  const { data: rgb } = await sharp(file).extract({ left: 8, top: 8, width: 40, height: 40 }).raw().toBuffer({ resolveWithObject: true });
  const backdrop = { r: 0, g: 0, b: 0 };
  for (let i = 0; i < rgb.length; i += 3) {
    backdrop.r += rgb[i];
    backdrop.g += rgb[i + 1];
    backdrop.b += rgb[i + 2];
  }
  const px = rgb.length / 3;
  backdrop.r = Math.round(backdrop.r / px);
  backdrop.g = Math.round(backdrop.g / px);
  backdrop.b = Math.round(backdrop.b / px);
  return { W, H, dividers: [d1, d2], panels, backdrop, labelTop };
}

/** Fixed OUT_W × OUT_H window centred on the figure; the backdrop colour fills any shortfall. */
function renderPanel(file: string, p: Panel, backdrop: { r: number; g: number; b: number }, cropH: number) {
  const half = OUT_W / 2;
  const right = p.left + p.width;
  const winL = Math.max(p.left, Math.round(p.centre - half));
  const winR = Math.min(right, Math.round(p.centre + half));
  const padL = Math.max(0, Math.round(p.left - (p.centre - half)));
  const takeW = winR - winL;
  const padR = OUT_W - takeW - padL;
  const padT = OUT_H - cropH;
  let img = sharp(file).extract({ left: winL, top: 0, width: takeW, height: cropH });
  if (padL > 0 || padR > 0 || padT > 0)
    img = img.extend({ top: padT, left: padL, right: Math.max(0, padR), background: backdrop });
  return img;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  const { jobs, skipped } = await planJobs();
  if (!jobs.length) {
    console.log("Nothing to process.");
    skipped.forEach((s) => console.log(`  skip  ${s.file}: ${s.reason}`));
    return;
  }

  const results: Result[] = [];
  for (const job of jobs) {
    const src = path.join(srcDir, job.file);
    const a = await analyse(src);
    const cropH = Math.min(OUT_H, a.labelTop === null ? a.H : a.labelTop - LABEL_PAD);
    const bytes: Record<string, number> = {};
    if (!dry) {
      const dir = path.join(outDir, job.slug);
      await fs.mkdir(dir, { recursive: true });
      for (const p of a.panels) {
        // Flatten the panel first so avif/webp encode the same pixels.
        const buf = await renderPanel(src, p, a.backdrop, cropH).png().toBuffer();
        const avif = path.join(dir, `${p.view}.avif`);
        const webp = path.join(dir, `${p.view}.webp`);
        await sharp(buf).avif({ quality: 64, effort: 6 }).toFile(avif);
        await sharp(buf).webp({ quality: 86, effort: 6 }).toFile(webp);
        bytes[p.view] = (await fs.stat(webp)).size;
      }
    }
    const notes = [
      job.note,
      a.W !== 1536 || a.H !== 1024 ? `source ${a.W}×${a.H}` : "",
      a.labelTop === null ? "no label row found" : "",
      cropH < OUT_H ? `labels sit high: padded ${OUT_H - cropH}px at the top` : "",
    ].filter(Boolean);
    results.push({ ...job, note: notes.join("; ") || undefined, panels: a.panels, dividers: a.dividers, cropH, labelTop: a.labelTop, bytes });
  }

  if (!dry) {
    await writeManifest(results);
    if (sampleCount) await writeSampleSheet(results);
  }
  report(results, skipped);
}

async function writeManifest(results: Result[]) {
  type Manifest = { products: Record<string, { width: number; height: number }> };
  let manifest: Manifest = { products: {} };
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as Manifest;
  } catch {
    /* first run */
  }
  for (const r of results) manifest.products[r.slug] = { width: OUT_W, height: OUT_H };
  const sorted = Object.fromEntries(Object.entries(manifest.products).sort(([a], [b]) => a.localeCompare(b)));
  await fs.writeFile(manifestPath, JSON.stringify({ products: sorted }, null, 2) + "\n");
}

/** Review sheet: each source with the crop windows drawn on it, then its three outputs. */
async function writeSampleSheet(results: Result[]) {
  const rowH = 460;
  const gap = 24;
  const rows = await Promise.all(
    results.map(async (r) => {
      const srcPath = path.join(srcDir, r.file);
      const meta = await sharp(srcPath).metadata();
      const W = meta.width!;
      const H = meta.height!;
      const scale = rowH / H;
      const marks = [
        `<line x1="0" y1="${r.cropH}" x2="${W}" y2="${r.cropH}" stroke="#B4532A" stroke-width="4"/>`,
        ...r.dividers.map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#B4532A" stroke-width="3" stroke-dasharray="12 8"/>`),
        ...r.panels.map(
          (p) => `<rect x="${p.centre - OUT_W / 2}" y="2" width="${OUT_W}" height="${OUT_H - 4}" fill="none" stroke="#ECE6DA" stroke-width="3" stroke-dasharray="4 6"/>`,
        ),
      ].join("");
      // sharp runs composite after resize, so flatten the overlay first.
      const marked = await sharp(srcPath)
        .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${marks}</svg>`) }])
        .png()
        .toBuffer();
      const annotated = await sharp(marked).resize({ height: rowH }).png().toBuffer();
      const outs = await Promise.all(
        VIEWS.map((v) =>
          sharp(path.join(outDir, r.slug, `${v}.webp`)).resize({ height: Math.round(OUT_H * scale) }).png().toBuffer({ resolveWithObject: true }),
        ),
      );
      return { annotated, annotatedW: Math.round(W * scale), outs };
    }),
  );

  const width = Math.max(...rows.map((row) => row.annotatedW + gap * 2 + row.outs.reduce((n, o) => n + o.info.width + 8, 0))) + gap;
  const height = rows.length * (rowH + gap) + gap;
  const composites: OverlayOptions[] = [];
  rows.forEach((row, i) => {
    const top = gap + i * (rowH + gap);
    composites.push({ input: row.annotated, left: gap, top });
    let x = gap + row.annotatedW + gap * 2;
    for (const o of row.outs) {
      composites.push({ input: o.data, left: x, top });
      x += o.info.width + 8;
    }
  });
  await fs.mkdir(previewDir, { recursive: true });
  const sheet = path.join(previewDir, "sample-sheet.png");
  await sharp({ create: { width, height, channels: 3, background: "#0B0B0A" } }).composite(composites).png().toFile(sheet);
  console.log(`\nReview sheet: ${path.relative(ROOT, sheet)}`);
  console.log("  rust dashed = detected dividers · rust solid = bottom crop · bone dashed = output window");
}

function report(results: Result[], skipped: { file: string; reason: string }[]) {
  const kb = (n: number) => `${Math.round(n / 1024)}KB`;
  console.log(`\n${dry ? "DRY RUN · " : ""}Split ${results.length} product(s) → ${path.relative(ROOT, outDir)}/  (each view ${OUT_W}×${OUT_H})\n`);
  for (const r of results) {
    const size = dry ? "" : `  webp ${r.panels.map((p) => kb(r.bytes[p.view] ?? 0)).join("/")}`;
    console.log(`  ✓ ${r.code.padEnd(11)} ${r.slug.padEnd(22)} dividers ${r.dividers.join(",").padEnd(9)} label@${r.labelTop ?? "-"} panels ${r.panels.map((p) => p.width).join("/")}${size}`);
    if (r.note) console.log(`      note: ${r.note}`);
  }
  if (skipped.length) {
    console.log("");
    skipped.forEach((s) => console.log(`  – skip ${s.file}: ${s.reason}`));
  }
  if (!sampleCount && !only) {
    const done = new Set(results.map((r) => r.slug));
    const missing = products.filter((p) => !done.has(p.slug)).map((p) => p.slug);
    if (missing.length) console.log(`\n  ! No image found for: ${missing.join(", ")}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
