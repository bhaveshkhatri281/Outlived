"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { commerce, formatINR, MAX_QTY_PER_LINE, type CheckoutResult, type PricedCart } from "@/lib/commerce";
import { useCart, useCartHydrated } from "@/lib/store/cart";

// 0/10 animation: no transitions anywhere on this page.
export function BagView() {
  const hydrated = useCartHydrated();
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const [priced, setPriced] = useState<PricedCart | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    commerce.priceCart(lines.map(({ slug, size, qty }) => ({ slug, size, qty }))).then((c) => live && setPriced(c));
    return () => {
      live = false;
    };
  }, [lines]);

  if (!hydrated) return <p className="mono gutter min-h-[50svh] py-20 text-ash">Opening the bag…</p>;

  if (checkout?.status === "unavailable") {
    return (
      <section className="gutter max-w-2xl py-20" aria-live="polite">
        <MonoLabel as="p">Checkout</MonoLabel>
        <h2 className="mt-4 text-[40px] font-extrabold uppercase leading-[0.9] tracking-[-0.04em] md:text-[56px]">{checkout.title}</h2>
        <p className="mt-6 text-[18px] leading-relaxed">{checkout.message}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Button variant="outline" onClick={() => setCheckout(null)}>
            ← Back to bag
          </Button>
          <ButtonLink href="/vault" variant="outline">
            Keep browsing
          </ButtonLink>
        </div>
      </section>
    );
  }

  if (lines.length === 0) {
    return (
      <section className="gutter min-h-[50svh] py-20">
        <p className="text-[40px] font-extrabold uppercase leading-[0.9] tracking-[-0.04em] md:text-[64px]">Nothing recovered yet.</p>
        <p className="mt-5 max-w-md text-[18px] text-bone">Every piece in the Vault is a numbered unit. Pick one before it&apos;s gone.</p>
        <ButtonLink href="/vault" className="mt-10">
          Enter the Vault →
        </ButtonLink>
      </section>
    );
  }

  const goCheckout = async () => {
    setBusy(true);
    const result = await commerce.checkout(lines.map(({ slug, size, qty }) => ({ slug, size, qty })));
    setBusy(false);
    if (result.status === "redirect") window.location.assign(result.url);
    else setCheckout(result);
  };

  const issueFor = (slug: string, size: string) => priced?.lines.find((l) => l.slug === slug && l.size === size)?.issue;
  const subtotal = priced?.subtotal ?? lines.reduce((n, l) => n + l.snapshot.price * l.qty, 0);
  const count = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="gutter grid gap-12 pb-10 md:grid-cols-12 md:gap-8">
      <ul className="border-t border-line md:col-span-8" aria-label="Items in your bag">
        {lines.map((l) => {
          const issue = issueFor(l.slug, l.size);
          return (
            <li key={l.id} className="grid grid-cols-[88px_1fr] gap-5 border-b border-line py-6 md:grid-cols-[120px_1fr_auto]">
              <Link href={`/vault/${l.slug}`} className="lit block bg-plinth" style={{ aspectRatio: "520 / 968" }}>
                <Image src={l.snapshot.image} alt={`${l.snapshot.name}, front view`} width={520} height={968} sizes="120px" className="h-full w-full object-cover" />
              </Link>
              <div className="min-w-0">
                <Link href={`/vault/${l.slug}`} className="text-[20px] font-bold uppercase leading-none tracking-[-0.02em] hover:underline">
                  {l.snapshot.name}
                </Link>
                <MonoLabel as="p" className="mt-2">
                  {l.snapshot.code} · Size {l.size} · {l.snapshot.colorName}
                </MonoLabel>
                {issue && (
                  <p className="mt-2 text-[15px] font-semibold">
                    <span className="mr-2 inline-block h-2 w-2 bg-rust" aria-hidden="true" />
                    {issue}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-5">
                  <div className="flex items-center border border-line" role="group" aria-label={`Quantity for ${l.snapshot.name}, size ${l.size}`}>
                    <button
                      type="button"
                      className="mono h-11 w-11 text-[16px] hover:bg-ink-2"
                      onClick={() => setQty(l.id, l.qty - 1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="mono w-8 text-center text-[14px] text-bone" aria-live="polite">
                      {l.qty}
                    </span>
                    <button
                      type="button"
                      className="mono h-11 w-11 text-[16px] hover:bg-ink-2 disabled:opacity-40"
                      onClick={() => setQty(l.id, l.qty + 1)}
                      disabled={l.qty >= MAX_QTY_PER_LINE}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(l.id)} className="mono text-bone underline decoration-line underline-offset-4 hover:decoration-rust">
                    Remove
                  </button>
                </div>
              </div>
              <p className="mono col-start-2 text-[15px] text-bone md:col-start-auto md:text-right">{formatINR(l.snapshot.price * l.qty)}</p>
            </li>
          );
        })}
      </ul>

      <aside className="md:col-span-4" aria-label="Order summary">
        <div className="border border-line bg-ink-2 p-6 md:sticky md:top-[calc(var(--header-h)+24px)]">
          <dl className="grid grid-cols-[1fr_auto] gap-y-3 text-[15px]">
            <dt>Items</dt>
            <dd className="mono text-right">{count}</dd>
            <dt>Subtotal</dt>
            <dd className="mono text-right text-[17px]">{formatINR(subtotal)}</dd>
            <dt>Shipping</dt>
            <dd className="text-right">Free across India {/* PLACEHOLDER */}</dd>
          </dl>
          <p className="mt-4 text-[14px] text-ash">Estimated delivery in 3–7 working days. Taxes included. {/* PLACEHOLDER */}</p>
          <Button onClick={goCheckout} disabled={busy || priced?.lines.some((l) => !l.available)} className="mt-6 w-full">
            {busy ? "Checking…" : "Checkout"}
          </Button>
          <Link href="/vault" className="mono mt-5 block text-center text-bone underline decoration-line underline-offset-4">
            Continue browsing
          </Link>
        </div>
      </aside>
    </div>
  );
}
