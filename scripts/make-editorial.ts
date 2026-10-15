/**
 * Builds editorial images from the split product views:
 *   public/editorial/unfold-<slug>.{webp,avif}      front | side | back panorama (Evidence lookbook)
 *   public/editorial/unfold-tessellation.{webp,avif} close-up of Soft Tessellation's folds ("The Unfold")
 *
 *   npm run editorial                               the close-up crop + the default panorama
 *   npm run editorial -- --slug pleated-hem-wings   one panorama
 *   npm run editorial -- --crop                     only the close-up crop
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public/editorial");
const args = process.argv.slice(2);
const i = args.indexOf("--slug");
const slug = i >= 0 ? args[i + 1] : "soft-tessellation";

/**
 * Close-up for The Unfold: Soft Tessellation's chest, tight on the diamond folds
 * (no backdrop, no labels). The source view is only 520px wide, so the 270px crop is
 * upscaled ~8× (lanczos3) with light sharpening and fine grain to keep it from looking smeared.
 */
const CROP = { slug: "soft-tessellation", view: "front", left: 130, top: 255, width: 270, height: 166, outWidth: 2160 };

async function closeUp() {
  const src = path.join(ROOT, "public/products", CROP.slug, `${CROP.view}.webp`);
  const outH = Math.round((CROP.outWidth * CROP.height) / CROP.width);
  const up = await sharp(src)
    .extract({ left: CROP.left, top: CROP.top, width: CROP.width, height: CROP.height })
    .resize({ width: CROP.outWidth, height: outH, kernel: "lanczos3" })
    .sharpen({ sigma: 1.4, m1: 0.6, m2: 1.2 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Fine, deterministic grain (±6 levels) so the upscale reads as texture, not blur.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const { data, info } = up;
  for (let p = 0; p < data.length; p += info.channels) {
    const n = rand() * 6;
    for (let c = 0; c < 3; c++) data[p + c] = Math.max(0, Math.min(255, data[p + c] + n));
  }
  const img = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
  await fs.mkdir(OUT, { recursive: true });
  await img.clone().webp({ quality: 82 }).toFile(path.join(OUT, "unfold-tessellation.webp"));
  await img.clone().avif({ quality: 58 }).toFile(path.join(OUT, "unfold-tessellation.avif"));
  console.log(`✓ public/editorial/unfold-tessellation.webp  ${info.width}×${info.height}`);
}

async function panorama(s: string) {
  const dir = path.join(ROOT, "public/products", s);
  const views = ["front", "side", "back"].map((v) => path.join(dir, `${v}.webp`));
  const meta = await sharp(views[0]).metadata();
  const w = meta.width!;
  // Crop to head-to-thigh so the folds read at full width.
  const h = Math.round(meta.height! * 0.72);
  const panels = await Promise.all(views.map((v) => sharp(v).extract({ left: 0, top: 0, width: w, height: h }).toBuffer()));
  await fs.mkdir(OUT, { recursive: true });
  const canvas = sharp({ create: { width: w * 3, height: h, channels: 3, background: "#212121" } }).composite(
    panels.map((input, k) => ({ input, left: k * w, top: 0 })),
  );
  const png = await canvas.png().toBuffer();
  await sharp(png).webp({ quality: 84 }).toFile(path.join(OUT, `unfold-${s}.webp`));
  await sharp(png).avif({ quality: 60 }).toFile(path.join(OUT, `unfold-${s}.avif`));
  console.log(`✓ public/editorial/unfold-${s}.webp  ${w * 3}×${h}`);
}

async function main() {
  if (args.includes("--crop")) return closeUp();
  if (i >= 0) return panorama(slug);
  await closeUp();
  await panorama(slug);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
