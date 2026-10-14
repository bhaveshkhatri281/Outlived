import manifest from "@/data/image-manifest.json";
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
