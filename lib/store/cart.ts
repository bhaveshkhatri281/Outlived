"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MAX_QTY_PER_LINE } from "@/lib/commerce/types";
import type { CartLineInput, Product, Size } from "@/lib/commerce/types";
import { safeStorage } from "@/lib/storage";

/** A bag line plus a display snapshot, so the bag renders instantly. Prices are re-checked via `commerce.priceCart`. */
export type CartLine = CartLineInput & {
  id: string; // `${slug}:${size}`
  snapshot: Pick<Product, "name" | "code" | "category" | "price" | "colorName"> & { image: string };
};

type CartState = {
  lines: CartLine[];
  add: (product: Product, size: Size, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "outlived-bag";

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (product, size, qty = 1) =>
        set((s) => {
          const id = `${product.slug}:${size}`;
          const existing = s.lines.find((l) => l.id === id);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.id === id ? { ...l, qty: Math.min(l.qty + qty, MAX_QTY_PER_LINE) } : l,
              ),
            };
          }
          const line: CartLine = {
            id,
            slug: product.slug,
            size,
            qty: Math.min(qty, MAX_QTY_PER_LINE),
            snapshot: {
              name: product.name,
              code: product.code,
              category: product.category,
              price: product.price,
              colorName: product.colorName,
              image: product.images.front,
            },
          };
          return { lines: [...s.lines, line] };
        }),
      setQty: (id, qty) =>
        set((s) => ({
          lines:
            qty < 1
              ? s.lines.filter((l) => l.id !== id)
              : s.lines.map((l) => (l.id === id ? { ...l, qty: Math.min(qty, MAX_QTY_PER_LINE) } : l)),
        })),
      remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ lines: s.lines }),
      // Hydrate after mount (see CartHydrator) so server and client HTML match.
      skipHydration: true,
    },
  ),
);

export const selectCount = (s: CartState) => s.lines.reduce((n, l) => n + l.qty, 0);

/** True once the saved bag has been read from localStorage. */
export function useCartHydrated() {
  return useSyncExternalStore(
    (cb) => useCart.persist.onFinishHydration(cb),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}

/** Mount once in the root layout: loads the saved bag and keeps tabs in sync. */
export function CartHydrator() {
  useEffect(() => {
    useCart.persist.rehydrate();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) useCart.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
