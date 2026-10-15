"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MonoLabel, placard } from "@/components/ui/MonoLabel";
import { formatINR } from "@/lib/commerce/format";
import { SIZES, type Product, type Size } from "@/lib/commerce/types";
import { useCart } from "@/lib/store/cart";
import { useToast } from "@/lib/store/toast";
import { SizeGuide } from "./SizeGuide";
import { UnitCounter } from "./UnitCounter";

/**
 * The calm info column (3/10 motion): identity, price, units, size, Add to Bag.
 * A sticky bar takes over on phones once the main button scrolls away.
 */
export function BuyPanel({ product: p, children }: { product: Product; children?: React.ReactNode }) {
  const [size, setSize] = useState<Size | null>(null);
  const [error, setError] = useState(false);
  const [guide, setGuide] = useState(false);
  const [pastButton, setPastButton] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const sizesRef = useRef<HTMLFieldSetElement>(null);
  const add = useCart((s) => s.add);
  const toast = useToast((s) => s.show);

  useEffect(() => {
    const el = addRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPastButton(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const addToBag = () => {
    if (!size) {
      setError(true);
      sizesRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      sizesRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      return;
    }
    add(p, size);
    toast({ title: "Added to bag", detail: `${p.name} · ${size}`, href: "/bag", cta: "View bag" });
  };

  return (
    <div className="@container">
      <MonoLabel as="p">{placard(p.code, `Era ${p.era}`, p.category)}</MonoLabel>
      <h1 className="mt-4 text-[44px] font-extrabold uppercase leading-[0.86] tracking-[-0.045em] break-normal [hyphens:none] md:text-[clamp(30px,min(15cqi,4.6vw),76px)]">
        {p.name}
      </h1>
      <div className="mt-5 flex items-baseline justify-between gap-6 border-b border-line pb-5">
        <p className="font-mono text-[22px] tabular-nums">{formatINR(p.price)}</p>
        <p className="text-[15px] text-ash">{p.colorName}</p>
      </div>

      <UnitCounter left={p.unitsLeft} total={p.unitsTotal} suffix="remaining" bar className="mt-6" />
      <MonoLabel as="p" className="mt-2">
        Remaining of a numbered run. Never restocked.
      </MonoLabel>

      <fieldset ref={sizesRef} className="mt-9" aria-describedby={error ? "size-error" : undefined}>
        <div className="mb-3 flex items-center justify-between">
          <legend className="mono text-bone">Size</legend>
          <button type="button" onClick={() => setGuide(true)} className="mono text-bone underline decoration-rust underline-offset-4">
            Size guide
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {SIZES.map((s) => {
            const available = p.sizes.includes(s);
            return (
              <label key={s} className={`relative ${available ? "" : "opacity-40"}`}>
                <input
                  type="radio"
                  name="size"
                  value={s}
                  disabled={!available}
                  checked={size === s}
                  onChange={() => {
                    setSize(s);
                    setError(false);
                  }}
                  className="peer sr-only"
                />
                <span className="mono flex h-12 cursor-pointer items-center justify-center border border-line text-[13px] text-bone transition-colors duration-150 hover:border-ash peer-checked:border-bone peer-checked:bg-bone peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bone">
                  {s}
                </span>
              </label>
            );
          })}
        </div>
        {error && (
          <p id="size-error" role="alert" className="mt-3 text-[15px] font-semibold text-bone">
            <span className="mr-2 inline-block h-2 w-2 bg-rust" aria-hidden="true" />
            Choose a size first.
          </p>
        )}
      </fieldset>

      <Button ref={addRef} onClick={addToBag} className="mt-6 w-full">
        Add to Bag — {formatINR(p.price)}
      </Button>
      <p className="mt-3 text-[14px] text-ash">Free shipping across India · 7-day size exchange {/* PLACEHOLDER */}</p>

      <p className="mt-10 font-serif text-[26px] italic leading-[1.15] text-bone md:text-[30px]">{p.constructionNote}</p>

      <div className="mt-10">{children}</div>

      <SizeGuide category={p.category} open={guide} onClose={() => setGuide(false)} />

      {/* Sticky buy bar (phones), after the main button has scrolled away. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur-md transition-transform duration-200 md:hidden ${
          pastButton ? "translate-y-0" : "translate-y-full"
        }`}
        aria-hidden={!pastButton}
      >
        <div className="gutter flex items-center gap-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold uppercase tracking-[-0.01em]">{p.name}</p>
            <p className="mono text-ash">
              {formatINR(p.price)}
              {size ? ` · ${size}` : ""}
            </p>
          </div>
          <Button onClick={addToBag} tabIndex={pastButton ? 0 : -1} className="h-12 px-5 text-[19px]">
            Add to Bag
          </Button>
        </div>
      </div>
    </div>
  );
}
