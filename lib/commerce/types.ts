/**
 * The single commerce interface the UI talks to. Providers (local data now,
 * Shopify Storefront or Razorpay later) implement `CommerceAdapter`; no UI
 * code imports a provider directly.
 */

export type Size = "S" | "M" | "L" | "XL" | "XXL";
export type Category = "Hoodie" | "Shacket" | "Jacket";
export type EraId = "01" | "02" | "03";
export type ProductStatus = "live" | "upcoming";
export type ProductView = "front" | "side" | "back";

export const SIZES: readonly Size[] = ["S", "M", "L", "XL", "XXL"];
export const VIEWS: readonly ProductView[] = ["front", "side", "back"];

/** Per-line quantity cap on limited units. */
export const MAX_QTY_PER_LINE = 5; // PLACEHOLDER

export type Product = {
  slug: string; // "book-jacket-wrap"
  code: string; // "OTL-D07-35"
  name: string; // "Book Jacket Wrap"
  category: Category;
  era: EraId;
  status: ProductStatus;
  price: number; // INR
  unitsTotal: number;
  unitsLeft: number;
  sizes: Size[];
  colorName: string;
  constructionNote: string; // 1–2 lines on the fold and why it exists
  specs: { fabric: string; gsm: number; fit: string; care: string };
  images: Record<ProductView, string>;
};

export type Era = {
  id: EraId;
  name: string; // "The Fold"
  line: string; // one short line under the section title
  status: ProductStatus;
};

export type ProductQuery = {
  era?: EraId;
  category?: Category;
  status?: ProductStatus;
};

/** What the bag holds: a product + size + quantity. Prices are never trusted from the client. */
export type CartLineInput = {
  slug: string;
  size: Size;
  qty: number;
};

export type PricedLine = CartLineInput & {
  product: Product;
  unitPrice: number;
  lineTotal: number;
  /** False when the product is gone, not live, the size isn't offered, or stock is short. */
  available: boolean;
  issue?: string;
};

export type PricedCart = {
  lines: PricedLine[];
  itemCount: number;
  subtotal: number;
  currency: "INR";
};

export type CheckoutResult =
  /** Hand off to a hosted checkout (Shopify Checkout, a Razorpay payment page, ...). */
  | { status: "redirect"; url: string }
  /** No payment provider connected yet (local adapter). */
  | { status: "unavailable"; title: string; message: string }
  | { status: "error"; message: string };

export type WaitlistInput = {
  /** 10-digit Indian mobile number, already normalised. */
  phone: string;
  era: EraId;
  channel: "whatsapp" | "sms";
};

export type WaitlistResult = { ok: true } | { ok: false; error: string };

export interface CommerceAdapter {
  readonly id: string;
  listEras(): Promise<Era[]>;
  listProducts(query?: ProductQuery): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | null>;
  /** Other pieces from the same Era, excluding `slug`. */
  listRelated(slug: string, limit?: number): Promise<Product[]>;
  /** Re-prices bag lines against the source of truth and flags anything unavailable. */
  priceCart(lines: CartLineInput[]): Promise<PricedCart>;
  checkout(lines: CartLineInput[]): Promise<CheckoutResult>;
  joinWaitlist(input: WaitlistInput): Promise<WaitlistResult>;
}
