"use client";

import { useState } from "react";
import { SIZES, type Product } from "@/lib/commerce/types";
import { useCart } from "@/lib/store/cart";
import { useToast } from "@/lib/store/toast";

/** "Add to Bag" that asks for a size inline, then adds. */
export function QuickAdd({ product: p }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const add = useCart((s) => s.add);
  const toast = useToast((s) => s.show);

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-12 border border-bone px-5 text-[14px] font-semibold uppercase tracking-[0.06em] transition-colors duration-150 hover:bg-bone hover:text-ink"
      >
        Add to Bag
      </button>
    );

  return (
    <div role="group" aria-label={`Choose a size for ${p.name}`} className="flex flex-wrap items-center gap-1.5">
      {SIZES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={!p.sizes.includes(s)}
          onClick={() => {
            add(p, s);
            setOpen(false);
            toast({ title: "Added to bag", detail: `${p.name} · ${s}`, href: "/bag", cta: "View bag" });
          }}
          className="mono h-12 min-w-12 border border-line px-3 text-bone hover:border-bone hover:bg-bone hover:text-ink disabled:opacity-40"
        >
          {s}
        </button>
      ))}
      <button type="button" onClick={() => setOpen(false)} className="mono h-12 px-2 text-ash hover:text-bone" aria-label="Cancel">
        ✕
      </button>
    </div>
  );
}
