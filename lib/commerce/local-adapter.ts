import { eras, products } from "@/data/products";
import { safeStorage } from "@/lib/storage";
import { MAX_QTY_PER_LINE } from "./types";
import type { CartLineInput, CommerceAdapter, PricedCart, PricedLine, ProductQuery } from "./types";

function matches(q: ProductQuery = {}) {
  return (p: (typeof products)[number]) =>
    (!q.era || p.era === q.era) &&
    (!q.category || p.category === q.category) &&
    (!q.status || p.status === q.status);
}

/** Local adapter: reads `data/products.ts`, no network, no payments. */
export const localAdapter: CommerceAdapter = {
  id: "local",

  async listEras() {
    return eras;
  },

  async listProducts(query) {
    return products.filter(matches(query));
  },

  async getProduct(slug) {
    return products.find((p) => p.slug === slug) ?? null;
  },

  async listRelated(slug, limit = 4) {
    const self = products.find((p) => p.slug === slug);
    if (!self) return [];
    return products
      .filter((p) => p.era === self.era && p.slug !== slug && p.status === "live")
      .slice(0, limit);
  },

  async priceCart(lines: CartLineInput[]): Promise<PricedCart> {
    const priced: PricedLine[] = [];
    for (const line of lines) {
      const product = products.find((p) => p.slug === line.slug);
      if (!product) continue; // product removed from the catalogue: drop the line
      const qty = Math.max(1, Math.min(line.qty, MAX_QTY_PER_LINE));
      let issue: string | undefined;
      if (product.status !== "live") issue = "Not available yet";
      else if (!product.sizes.includes(line.size)) issue = `Size ${line.size} is not offered`;
      else if (product.unitsLeft < qty) issue = `Only ${product.unitsLeft} left`;
      priced.push({
        ...line,
        qty,
        product,
        unitPrice: product.price,
        lineTotal: product.price * qty,
        available: !issue,
        issue,
      });
    }
    const ok = priced.filter((l) => l.available);
    return {
      lines: priced,
      itemCount: ok.reduce((n, l) => n + l.qty, 0),
      subtotal: ok.reduce((n, l) => n + l.lineTotal, 0),
      currency: "INR",
    };
  },

  async checkout() {
    // Shopify: create a cart via the Storefront API and return { status: "redirect", url: checkoutUrl }.
    // Razorpay: create an order server-side, then open Razorpay Checkout with the order id.
    return {
      status: "unavailable",
      title: "Checkout coming soon",
      message: "Payment provider not connected yet. Your bag is saved on this device.",
    };
  },

  async joinWaitlist(input) {
    // Stored on this device only until a backend (WhatsApp Business API, CRM, ...) is connected.
    try {
      const key = "outlived-waitlist";
      const list = JSON.parse(safeStorage.getItem(key) ?? "[]") as unknown[];
      list.push({ ...input, at: new Date().toISOString() });
      safeStorage.setItem(key, JSON.stringify(list));
      console.info("[waitlist] stored locally", input);
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not save your number. Please try again." };
    }
  },
};
