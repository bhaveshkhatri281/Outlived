/**
 * Builds editorial composites from the split product views:
 *   public/editorial/unfold-<slug>.{webp,avif}   front | side | back panorama for "The Unfold"
 *
 *   npm run editorial
 *   npm run editorial -- --slug pleated-hem-wings
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const i = args.indexOf("--slug");
const slug = i >= 0 ? args[i + 1] : "soft-tessellation";

async function main() {
  const dir = path.join(ROOT, "public/products", slug);
  const views = ["front", "side", "back"].map((v) => path.join(dir, `${v}.webp`));
  const meta = await sharp(views[0]).metadata();
  const w = meta.width!;
  // Crop to head-to-thigh so the folds read at full width.
  const h = Math.round(meta.height! * 0.72);
  const panels = await Promise.all(views.map((v) => sharp(v).extract({ left: 0, top: 0, width: w, height: h }).toBuffer()));
  const out = path.join(ROOT, "public/editorial");
  await fs.mkdir(out, { recursive: true });
  const canvas = sharp({ create: { width: w * 3, height: h, channels: 3, background: "#212121" } }).composite(
    panels.map((input, k) => ({ input, left: k * w, top: 0 })),
  );
  const png = await canvas.png().toBuffer();
  await sharp(png).webp({ quality: 84 }).toFile(path.join(out, `unfold-${slug}.webp`));
  await sharp(png).avif({ quality: 60 }).toFile(path.join(out, `unfold-${slug}.avif`));
  console.log(`✓ public/editorial/unfold-${slug}.webp  ${w * 3}×${h}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
