import manifest from "@/data/image-manifest.json";
import cutouts from "@/data/cutouts.json";
import type { Product, ProductView } from "@/lib/commerce/types";

const DIMS = manifest.products as Record<string, { width: number; height: number }>;

/** Intrinsic size of a product view (all views of a product share it). */
export function imageSize(slug: string) {
  return DIMS[slug] ?? { width: 520, height: 968 };
}

export const IMAGE_ASPECT = 520 / 968;

export function viewAlt(p: Pick<Product, "name" | "category">, view: ProductView) {
  return `${p.name} ${p.category.toLowerCase()}, ${view} view`;
}

const CUTOUTS = cutouts as Record<string, string[]>;

/**
 * The image to stand on the page for one view: the transparent cutout when
 * scripts/cutout-products.ts has made one (data/cutouts.json), else the
 * original photo. `mask` is the edge treatment that goes with it: the cutout
 * only fades its cut-off bottom; the original keeps the soft feathered pool.
 */
export function figureImage(p: Pick<Product, "slug" | "images">, view: ProductView) {
  const cut = CUTOUTS[p.slug]?.includes(view) ?? false;
  return {
    src: cut ? p.images[view].replace(/\.webp$/, "-cut.webp") : p.images[view],
    cut,
    mask: cut ? "figure-fade" : "lit",
  };
}
