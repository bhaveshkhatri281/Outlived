"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ProductCard, type CardScale } from "@/components/product/ProductCard";
import type { Category, EraId, Product } from "@/lib/commerce/types";
import { getMotionTier } from "@/lib/motion/capability";
import { loadFlip } from "@/lib/motion/gsap";
import { getLenis, onLenisChange } from "@/lib/motion/lenis";

type EraFilter = "all" | Exclude<EraId, "03">;
type Filters = { era: EraFilter; type: Category | null };

const TYPES: Category[] = ["Hoodie", "Shacket", "Jacket"];

/**
 * Editorial rhythm, repeating every 5 cards on a 12-column grid:
 * one large piece, then smaller ones dropped to different heights.
 */
const PATTERN: { col: string; mt: string; scale: CardScale; sizes: string }[] = [
  { col: "1 / span 5", mt: "0", scale: "xl", sizes: "(min-width: 768px) 42vw, 100vw" },
  { col: "8 / span 4", mt: "22vh", scale: "md", sizes: "(min-width: 768px) 33vw, 82vw" },
  { col: "2 / span 4", mt: "8vh", scale: "md", sizes: "(min-width: 768px) 33vw, 82vw" },
  { col: "7 / span 3", mt: "24vh", scale: "sm", sizes: "(min-width: 768px) 25vw, 82vw" },
  { col: "10 / span 3", mt: "2vh", scale: "sm", sizes: "(min-width: 768px) 25vw, 82vw" },
];
// Phones: one column, alternating full width and an inset card for the same rhythm.
const MOBILE = ["w-full", "ml-auto w-[82%]", "w-[82%]", "ml-auto w-[82%]", "w-full"];

function matches(p: Product, f: Filters) {
  return (f.era === "all" || p.era === f.era) && (!f.type || p.category === f.type);
}

export function VaultGrid({ products }: { products: Product[] }) {
  const [filters, setFilters] = useState<Filters>({ era: "all", type: null });
  const gridRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<unknown>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const [chipFade, setChipFade] = useState({ left: false, right: false });
  const updateChipFades = useCallback(() => {
    const el = chipsRef.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setChipFade((f) => (f.left === left && f.right === right ? f : { left, right }));
  }, []);

  useEffect(() => {
    updateChipFades();
    window.addEventListener("resize", updateChipFades);
    return () => window.removeEventListener("resize", updateChipFades);
  }, [updateChipFades]);

  // Restore filters from the URL (?era=01&type=hoodie) without a Suspense boundary.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const era = q.get("era");
    const type = TYPES.find((t) => t.toLowerCase() === q.get("type"));
    if (era === "01" || era === "02" || type) setFilters({ era: era === "01" || era === "02" ? era : "all", type: type ?? null });
    loadFlip(); // warm the chunk
  }, []);

  const order = useMemo(() => {
    let i = 0;
    return new Map(products.filter((p) => matches(p, filters)).map((p) => [p.slug, i++]));
  }, [products, filters]);

  const apply = async (next: Filters) => {
    const url = new URL(location.href);
    url.searchParams.delete("era");
    url.searchParams.delete("type");
    if (next.era !== "all") url.searchParams.set("era", next.era);
    if (next.type) url.searchParams.set("type", next.type.toLowerCase());
    history.replaceState(history.state, "", url);

    const grid = gridRef.current;
    if (!grid || getMotionTier() === "static") return setFilters(next);
    const { gsap, Flip } = await loadFlip();
    const leaving = products.filter((p) => order.has(p.slug) && !matches(p, next)).map((p) => grid.querySelector(`[data-flip-id="${p.slug}"]`));
    if (leaving.length) await gsap.to(leaving, { opacity: 0, duration: 0.15, ease: "power1.out" });
    // Only cards on screen FLIP to their new place; anything arriving from off-screen fades in where it lands.
    const vh = window.innerHeight;
    const onScreen = Array.from(grid.querySelectorAll<HTMLElement>("[data-flip-id]")).filter((el) => {
      if (el.offsetParent === null) return false;
      const r = el.getBoundingClientRect();
      return r.bottom > -80 && r.top < vh + 80;
    });
    flipState.current = { state: Flip.getState(onScreen), ids: new Set(onScreen.map((el) => el.dataset.flipId)) };
    setFilters(next);
  };

  useLayoutEffect(() => {
    const pending = flipState.current as { state: unknown; ids: Set<string | undefined> } | null;
    if (!pending) return;
    flipState.current = null;
    loadFlip().then(({ gsap, Flip }) => {
      const grid = gridRef.current!;
      const all = Array.from(grid.querySelectorAll<HTMLElement>("[data-flip-id]")).filter((el) => el.offsetParent !== null);
      gsap.set(all, { opacity: 1 });
      Flip.from(pending.state as ReturnType<typeof Flip.getState>, { duration: 0.6, ease: "power2.inOut" });
      const arriving = all.filter((el) => !pending.ids.has(el.dataset.flipId));
      gsap.fromTo(arriving, { opacity: 0, y: 48 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.04, ease: "power3.out" });
    });
  }, [filters]);

  // Fast scrolling skews the grid slightly (±2°), springing back when it settles.
  useEffect(() => {
    if (getMotionTier() === "static") return;
    let detach: (() => void) | undefined;
    let cancelled = false;
    loadFlip().then(({ gsap }) => {
      if (cancelled || !gridRef.current) return;
      const skewTo = gsap.quickTo(gridRef.current, "skewY", { duration: 0.6, ease: "power3.out" });
      const attach = (lenis: ReturnType<typeof getLenis>) => {
        detach?.();
        detach = lenis?.on("scroll", (l: { velocity: number }) => skewTo(Math.max(-2, Math.min(2, l.velocity * 0.06))));
      };
      attach(getLenis());
      const off = onLenisChange(attach);
      const prev = detach;
      detach = () => {
        prev?.();
        off();
      };
    });
    return () => {
      cancelled = true;
      detach?.();
    };
  }, []);

  const counts = {
    all: products.length,
    "01": products.filter((p) => p.era === "01").length,
    "02": products.filter((p) => p.era === "02").length,
  };
  const typeCount = (t: Category) => products.filter((p) => p.category === t && (filters.era === "all" || p.era === filters.era)).length;

  // Edge fades on the chip row: right edge while more chips are hidden off-screen, left once scrolled.
  const chipMask =
    chipFade.left || chipFade.right
      ? `linear-gradient(to right, ${chipFade.left ? "transparent 0, #000 40px" : "#000 0"}, ${chipFade.right ? "#000 calc(100% - 48px), transparent 100%" : "#000 100%"})`
      : undefined;

  return (
    <>
      <div className="sticky top-[var(--header-h)] z-[35] border-y border-line bg-ink/92 backdrop-blur-md">
        <div
          ref={chipsRef}
          onScroll={updateChipFades}
          className="gutter no-scrollbar flex snap-x snap-proximity scroll-px-[var(--gutter)] items-center gap-2 overflow-x-auto py-3"
          style={{ maskImage: chipMask, WebkitMaskImage: chipMask }}
          role="toolbar"
          aria-label="Filter the Vault"
        >
          {(["all", "01", "02"] as const).map((era) => (
            <Chip key={era} active={filters.era === era} count={counts[era]} onClick={() => apply({ era, type: filters.type })}>
              {era === "all" ? "All" : `Era ${era}`}
            </Chip>
          ))}
          <span className="mx-2 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
          {TYPES.map((t) => (
            <Chip
              key={t}
              small
              active={filters.type === t}
              count={typeCount(t)}
              onClick={() => apply({ era: filters.era, type: filters.type === t ? null : t })}
            >
              {t}
            </Chip>
          ))}
          <p className="mono ml-auto hidden shrink-0 pl-6 text-ash md:block" aria-live="polite">
            Showing {order.size} of {products.length}
          </p>
        </div>
      </div>

      <div ref={gridRef} className="gutter flex flex-col gap-16 pb-24 pt-14 will-change-transform md:grid md:grid-cols-12 md:gap-x-[2vw] md:gap-y-0 md:pt-20">
        {products.map((p) => {
          const i = order.get(p.slug);
          const slot = PATTERN[(i ?? 0) % PATTERN.length];
          const style = { "--col": slot.col, "--mt": slot.mt } as CSSProperties;
          return (
            <div
              key={p.slug}
              data-flip-id={p.slug}
              style={style}
              className={`${i === undefined ? "hidden" : ""} ${MOBILE[(i ?? 0) % MOBILE.length]} md:ml-0 md:w-auto md:[grid-column:var(--col)] md:[margin-top:var(--mt)] md:pb-[10vh]`}
            >
              <ProductCard product={p} scale={slot.scale} sizes={slot.sizes} priority={(i ?? 99) < 2} />
            </div>
          );
        })}
        {order.size === 0 && (
          <p className="text-[18px] md:col-span-12">
            Nothing recovered in this combination.{" "}
            <button type="button" className="underline decoration-rust underline-offset-4" onClick={() => apply({ era: "all", type: null })}>
              Show everything
            </button>
          </p>
        )}
      </div>
    </>
  );
}

function Chip({
  active,
  count,
  small,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  small?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`mono flex h-10 shrink-0 snap-start items-center gap-2 whitespace-nowrap border px-4 transition-colors duration-150 ${
        active ? "border-bone bg-bone text-ink" : "border-line text-bone hover:border-ash"
      } ${small ? "h-9 px-3" : ""}`}
    >
      {active && <span className="h-1.5 w-1.5 bg-rust" aria-hidden="true" />}
      {children}
      <span className={active ? "text-ink/70" : "text-ash"}>{count}</span>
    </button>
  );
}
