// Product catalogue for the local commerce adapter.
// Only `import type` here: scripts/split-products.ts loads this file directly with Node.
import type { Category, Era, EraId, Product, ProductStatus, Size } from "../lib/commerce/types";

export const eras: Era[] = [
  { id: "01", name: "The Fold", line: "Origami pleats, overfolds and gussets.", status: "live" }, // PLACEHOLDER copy
  { id: "02", name: "Air", line: "Mesh, texture and volume.", status: "live" }, // PLACEHOLDER copy
  { id: "03", name: "Liquid", line: "Era 03 is being recovered.", status: "upcoming" },
];

const ALL_SIZES: Size[] = ["S", "M", "L", "XL", "XXL"];

// PLACEHOLDER: fabric, GSM, fit and care per category. Replace with real specs.
const SPECS: Record<Category, Product["specs"]> = {
  Hoodie: {
    fabric: "100% cotton loopback fleece", // PLACEHOLDER
    gsm: 450, // PLACEHOLDER
    fit: "Oversized, dropped shoulder", // PLACEHOLDER
    care: "Cold wash inside out. Dry flat. Do not tumble dry.", // PLACEHOLDER
  },
  Shacket: {
    fabric: "Brushed cotton twill", // PLACEHOLDER
    gsm: 380, // PLACEHOLDER
    fit: "Relaxed, boxy", // PLACEHOLDER
    care: "Cold wash inside out. Line dry. Warm iron on reverse.", // PLACEHOLDER
  },
  Jacket: {
    fabric: "Technical mesh shell, nylon lining", // PLACEHOLDER
    gsm: 220, // PLACEHOLDER
    fit: "Voluminous, cropped at the hip", // PLACEHOLDER
    care: "Hand wash cold. Hang dry away from sunlight.", // PLACEHOLDER
  },
};

/** Image paths written by scripts/split-products.ts. */
export function productImages(slug: string): Product["images"] {
  const base = `/products/${slug}`;
  return { front: `${base}/front.webp`, side: `${base}/side.webp`, back: `${base}/back.webp` };
}

type Entry = {
  code: string;
  name: string;
  category: Category;
  era: EraId;
  colorName: string;
  constructionNote: string;
  price: number;
  unitsTotal: number;
  unitsLeft: number;
  status?: ProductStatus;
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function make(e: Entry): Product {
  const slug = slugify(e.name);
  const status = e.status ?? "live";
  return {
    slug,
    code: e.code,
    name: e.name,
    category: e.category,
    era: e.era,
    status,
    price: e.price,
    unitsTotal: e.unitsTotal,
    unitsLeft: e.unitsLeft,
    sizes: status === "live" ? ALL_SIZES : [],
    colorName: e.colorName,
    constructionNote: e.constructionNote,
    specs: SPECS[e.category],
    images: productImages(slug),
  };
}

// PLACEHOLDER: every `price`, `unitsTotal` and `unitsLeft` below is dummy data.
// PLACEHOLDER: every `constructionNote` is written from the name and colour; check against the garment.
export const products: Product[] = [
  // ── Era 01 · The Fold · Hoodies ──────────────────────────────────────
  make({
    code: "OTL-D07-01", name: "Envelope Basin", category: "Hoodie", era: "01", colorName: "Bone",
    constructionNote: "The pocket is cut like an envelope: four flaps fold to the centre and settle into a shallow basin at the waist.",
    price: 5999, unitsTotal: 150, unitsLeft: 62, // PLACEHOLDER
  }),
  make({
    code: "OTL-D07-02", name: "Concertina Shoulders", category: "Hoodie", era: "01", colorName: "Sea Teal",
    constructionNote: "Accordion pleats run across both shoulders, so the yoke opens when you reach and folds flat when you don't.",
    price: 6499, unitsTotal: 150, unitsLeft: 88, // PLACEHOLDER
  }),
  make({
    code: "OTL-D07-08", name: "Folded Saddle", category: "Hoodie", era: "01", colorName: "Sand",
    constructionNote: "The saddle shoulder is folded back on itself, leaving a raised ridge that runs from collar to cuff.",
    price: 5999, unitsTotal: 150, unitsLeft: 104, // PLACEHOLDER
  }),
  make({
    code: "OTL-D07-11", name: "Parchment Gusset", category: "Hoodie", era: "01", colorName: "Stone / Olive",
    constructionNote: "Olive gussets are set into the side seams like the creases of an old letter, adding room through the ribs.",
    price: 6299, unitsTotal: 150, unitsLeft: 39, // PLACEHOLDER
  }),
  make({
    code: "OTL-D07-13", name: "Soft Tessellation", category: "Hoodie", era: "01", colorName: "Sage",
    constructionNote: "Stitched-down triangles tile the body, folding the fleece into a soft, repeating relief.",
    price: 6999, unitsTotal: 150, unitsLeft: 71, // PLACEHOLDER
  }),
  make({
    code: "OTL-D07-22", name: "Folded Apron", category: "Hoodie", era: "01", colorName: "Olive",
    constructionNote: "A second layer drops from the chest like a folded apron and doubles as a deep front pocket.",
    price: 5499, unitsTotal: 150, unitsLeft: 120, // PLACEHOLDER
  }),
  make({
    code: "OTL-D07-24", name: "Stepped Shelf", category: "Hoodie", era: "01", colorName: "Lavender",
    constructionNote: "Horizontal tucks step down the torso, each one a small shelf of folded fabric.",
    price: 6299, unitsTotal: 150, unitsLeft: 55, // PLACEHOLDER
  }),
  make({
    code: "OTL-D07-27", name: "Pleated Hem Wings", category: "Hoodie", era: "01", colorName: "Taupe / Plum",
    constructionNote: "Box pleats at the hem open like wings as you move, showing a flash of plum lining.",
    price: 6799, unitsTotal: 150, unitsLeft: 23, // PLACEHOLDER
  }),
  make({
    code: "OTL-D07-33", name: "Turned Page Sleeves", category: "Hoodie", era: "01", colorName: "Apricot / Rust",
    constructionNote: "Each sleeve ends in a rust panel turned back on itself, like the corner of a page folded down.",
    price: 6499, unitsTotal: 150, unitsLeft: 93, // PLACEHOLDER
  }),
  make({
    code: "OTL-D07-35", name: "Book Jacket Wrap", category: "Hoodie", era: "01", colorName: "Dusk Mauve",
    constructionNote: "A front panel wraps across the chest like a dust jacket and pins at the hip.",
    price: 7499, unitsTotal: 150, unitsLeft: 47, // PLACEHOLDER
  }),

  // ── Era 01 · The Fold · Shackets ─────────────────────────────────────
  make({
    code: "OTL-S07-02", name: "Concertina Saddle", category: "Shacket", era: "01", colorName: "Rust / Teal",
    constructionNote: "Concertina pleats cross the saddle shoulders and stop at a contrast teal collar.",
    price: 7999, unitsTotal: 120, unitsLeft: 34, // PLACEHOLDER
  }),
  make({
    code: "OTL-S07-03", name: "Miter Stack", category: "Shacket", era: "01", colorName: "Bone",
    constructionNote: "Mitred panels stack down the placket, every corner folded at a clean 45 degrees.",
    price: 7499, unitsTotal: 120, unitsLeft: 81, // PLACEHOLDER
  }),
  make({
    code: "OTL-S07-05", name: "Parallel Turn", category: "Shacket", era: "01", colorName: "Navy",
    constructionNote: "Two parallel folds run the length of the front and turn together at the hem.",
    price: 7499, unitsTotal: 120, unitsLeft: 66, // PLACEHOLDER
  }),
  make({
    code: "OTL-S07-06", name: "Pleat Exchange", category: "Shacket", era: "01", colorName: "Camel",
    constructionNote: "Front pleats swap direction at the waist seam: they fold one way above it and the other way below.",
    price: 7799, unitsTotal: 120, unitsLeft: 52, // PLACEHOLDER
  }),
  make({
    code: "OTL-S07-28", name: "Overfold Pavement", category: "Shacket", era: "01", colorName: "Moss",
    constructionNote: "Rectangular overfolds are laid edge to edge across the back like paving stones.",
    price: 7999, unitsTotal: 120, unitsLeft: 18, // PLACEHOLDER
  }),
  make({
    code: "OTL-S07-31", name: "Turned Leaf", category: "Shacket", era: "01", colorName: "Chocolate / Sand",
    constructionNote: "A sand-faced front panel turns back over the chocolate body like a leaf mid-turn.",
    price: 7799, unitsTotal: 120, unitsLeft: 73, // PLACEHOLDER
  }),

  // ── Era 02 · Air · Jackets ───────────────────────────────────────────
  make({
    code: "OTL-J08-01", name: "Air Bell", category: "Jacket", era: "02", colorName: "Lilac",
    constructionNote: "Mesh panels flare out from the yoke into a bell that holds a layer of air around the body.",
    price: 8499, unitsTotal: 100, unitsLeft: 41, // PLACEHOLDER
  }),
  make({
    code: "OTL-J08-06", name: "Mesh Cocoon", category: "Jacket", era: "02", colorName: "Sand",
    constructionNote: "A rounded mesh shell cocoons the torso, loose through the body and gathered at the hem.",
    price: 8299, unitsTotal: 100, unitsLeft: 59, // PLACEHOLDER
  }),
  make({
    code: "OTL-J08-10", name: "Screen Lantern", category: "Jacket", era: "02", colorName: "Bone / Black",
    constructionNote: "Sheer screen panels framed in black piping stand away from the body like a paper lantern.",
    price: 8999, unitsTotal: 100, unitsLeft: 27, // PLACEHOLDER
  }),
  make({
    code: "OTL-J08-14", name: "Loft Ribbon", category: "Jacket", era: "02", colorName: "Petrol Blue",
    constructionNote: "Lofted channels wrap the body in ribbons, adding volume without adding weight.",
    price: 8799, unitsTotal: 100, unitsLeft: 64, // PLACEHOLDER
  }),
  make({
    code: "OTL-J08-15", name: "Air Bloom", category: "Jacket", era: "02", colorName: "Ivory / Grey",
    constructionNote: "Layered mesh petals open from the collar, so the jacket blooms as it catches air.",
    price: 8999, unitsTotal: 100, unitsLeft: 12, // PLACEHOLDER
  }),

  // ── Era 03 · Liquid · upcoming (teased, not purchasable) ─────────────
  make({
    code: "OTL-D02-01", name: "Mercury Tide", category: "Hoodie", era: "03", colorName: "Liquid Silver", // PLACEHOLDER colour
    constructionNote: "Fluid drapes pool at the hem like a tide pulling out.",
    price: 7999, unitsTotal: 100, unitsLeft: 100, status: "upcoming", // PLACEHOLDER
  }),
  make({
    code: "OTL-D02-05", name: "Capillary Flow", category: "Hoodie", era: "03", colorName: "Deep Water", // PLACEHOLDER colour
    constructionNote: "Fine channels of stitching branch across the body like water finding its way.",
    price: 7999, unitsTotal: 100, unitsLeft: 100, status: "upcoming", // PLACEHOLDER
  }),
];

/** Source files that must never be imported (see brief §6). */
export const EXCLUDED_NAMES = ["Poured Type", "Silt and Sheen", "Vent Contour", "Porous Waist"];
