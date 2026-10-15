"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MonoLabel, placard } from "@/components/ui/MonoLabel";
import { UnitCounter } from "@/components/product/UnitCounter";
import { formatINR } from "@/lib/commerce/format";
import type { Era, Product } from "@/lib/commerce/types";
import { figureImage, viewAlt } from "@/lib/images";
import { useMotionTier } from "@/lib/motion/capability";
import { useGsap } from "@/lib/motion/useGsap";
import { playFold } from "@/lib/sound";
import { QuickAdd } from "./QuickAdd";

const STRIPS = 3;

/**
 * An Era opens like an archive volume: the chapter card unfolds from a
 * creased state, then four featured pieces sit stacked like pages. Desktop:
 * pinned, each page turns on its left edge as you scroll. Phones: a swipe
 * carousel where pages turn away as they leave.
 */
export function EraChapter({ era, featured, total }: { era: Era; featured: Product[]; total: number }) {
  const tier = useMotionTier();
  const cardRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const animated = tier !== "static";

  // Chapter card: strips crease open (scrubbed).
  useGsap(
    cardRef,
    ({ gsap }, el) => {
      const strips = gsap.utils.toArray<HTMLElement>("[data-strip]", el);
      const shades = gsap.utils.toArray<HTMLElement>("[data-shade]", el);
      gsap.fromTo(
        strips,
        { rotateX: (i: number) => (i % 2 ? -78 : 78) },
        { rotateX: 0, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 92%", end: "top 35%", scrub: 0.6 } },
      );
      gsap.fromTo(shades, { opacity: 0.85 }, { opacity: 0, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 92%", end: "top 35%", scrub: 0.6 } });
    },
    [],
    animated,
  );

  // Page stack: pinned on desktop, pages turn around their left edge.
  useGsap(
    stackRef,
    ({ gsap, ScrollTrigger }, el) => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        const pages = gsap.utils.toArray<HTMLElement>("[data-page]", el);
        const sweeps = gsap.utils.toArray<HTMLElement>("[data-sweep]", el);
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${window.innerHeight * (pages.length - 1) * 0.85}`,
            pin: true,
            scrub: 0.7,
            snap: { snapTo: 1 / (pages.length - 1), duration: 0.5, ease: "power2.inOut" },
            onUpdate: (self) => setPage(Math.round(self.progress * (pages.length - 1))),
          },
        });
        pages.slice(0, -1).forEach((pg, i) => {
          tl.to(pg, { rotateY: -168, duration: 1 }, i);
          tl.fromTo(sweeps[i], { opacity: 0 }, { opacity: 0.9, duration: 0.5 }, i);
          tl.to(sweeps[i], { opacity: 0, duration: 0.5 }, i + 0.5);
        });
        ScrollTrigger.refresh();
      });
      return () => mm.revert();
    },
    [featured.length],
    animated,
  );

  // Phones: pages turn as they scroll out of the carousel.
  const railRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !animated) return;
    const onScroll = () => {
      const w = rail.clientWidth;
      const cards = Array.from(rail.children) as HTMLElement[];
      cards.forEach((c, i) => {
        const off = (c.offsetLeft - rail.scrollLeft - 12) / w; // 0 when snapped
        const t = Math.max(-1, Math.min(0, off));
        c.style.transform = `perspective(1200px) rotateY(${t * 55}deg)`;
        c.style.opacity = String(1 + t * 0.6);
        if (Math.abs(off) < 0.5) setPage(i);
      });
    };
    onScroll();
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => rail.removeEventListener("scroll", onScroll);
  }, [animated]);

  // A paper sound on each page turn (only when sound is on).
  const lastPage = useRef(0);
  useEffect(() => {
    if (page !== lastPage.current) playFold();
    lastPage.current = page;
  }, [page]);

  const counter = `${String(page + 1).padStart(2, "0")} / ${String(featured.length).padStart(2, "0")}`;
  const viewAll = (
    <Link href={`/vault?era=${era.id}`} className="mono text-bone underline decoration-rust underline-offset-4">
      View all {total} →
    </Link>
  );

  const chapter = (
    <div className="gutter py-14 md:py-20">
      <MonoLabel as="p">Chapter {era.id} · {total} pieces</MonoLabel>
      <h2 className="mt-4 text-[16vw] font-extrabold uppercase leading-[0.8] tracking-[-0.06em] md:text-[10vw]">
        Era {era.id} — {era.name}
      </h2>
      <p className="mt-6 max-w-md text-[18px] leading-snug md:text-[20px]">{era.line}</p>
    </div>
  );

  return (
    <section aria-labelledby={`era-${era.id}`} className="relative">
      <span id={`era-${era.id}`} className="sr-only">
        Era {era.id}: {era.name}
      </span>

      {/* Chapter card: N copies of the card, each clipped to one strip, creased alternately. */}
      <div ref={cardRef} className="relative overflow-hidden border-y border-line bg-ink-2 [perspective:1400px]">
        <div className="invisible" aria-hidden="true">
          {chapter}
        </div>
        {Array.from({ length: STRIPS }).map((_, i) => (
          <div
            key={i}
            data-strip
            aria-hidden={i > 0}
            className="absolute inset-0 overflow-hidden bg-ink-2"
            style={{
              clipPath: `inset(${(i / STRIPS) * 100}% 0 ${100 - ((i + 1) / STRIPS) * 100}% 0)`,
              transformOrigin: `50% ${((i + 0.5) / STRIPS) * 100}%`,
            }}
          >
            {chapter}
            <div data-shade className="pointer-events-none absolute inset-0 bg-ink opacity-0" />
          </div>
        ))}
      </div>

      {/* Desktop: pinned page stack. */}
      {animated ? (
        <div ref={stackRef} className="relative hidden h-[100svh] overflow-hidden md:block">
          <div className="gutter absolute inset-x-0 top-[calc(var(--header-h)+20px)] z-30 flex items-center justify-between">
            <MonoLabel tone="bone" aria-live="polite">
              {counter}
            </MonoLabel>
            {viewAll}
          </div>
          <div className="absolute inset-x-[var(--gutter)] bottom-[4svh] top-[calc(var(--header-h)+64px)] [perspective:2400px]">
            {featured.map((p, i) => (
              <article
                key={p.slug}
                data-page
                className="absolute inset-0 grid grid-cols-12 border border-line bg-ink-2 [backface-visibility:hidden] [transform-origin:left_center]"
                style={{ zIndex: featured.length - i }}
              >
                <PageContent product={p} index={i} count={featured.length} />
                <div data-sweep className="pointer-events-none absolute inset-0 bg-linear-to-l from-ink via-ink/40 to-transparent opacity-0" />
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="gutter hidden flex-col gap-6 py-10 md:flex">
          <div className="flex justify-end">{viewAll}</div>
          {featured.map((p, i) => (
            <article key={p.slug} className="grid h-[80svh] grid-cols-12 border border-line bg-ink-2">
              <PageContent product={p} index={i} count={featured.length} />
            </article>
          ))}
        </div>
      )}

      {/* Phones: swipe carousel with the same page turn. */}
      <div className="md:hidden">
        <div className="gutter flex items-center justify-between pb-4 pt-8">
          <MonoLabel tone="bone">{counter}</MonoLabel>
          {viewAll}
        </div>
        <div ref={railRef} className="no-scrollbar relative flex snap-x snap-mandatory scroll-px-3 gap-3 overflow-x-auto px-3 pb-6 [contain:paint]">
          {featured.map((p, i) => (
            <article key={p.slug} className="w-[80vw] shrink-0 snap-start border border-line bg-ink-2 [transform-origin:left_center]">
              <PageContent product={p} index={i} count={featured.length} compact />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PageContent({ product: p, index, count, compact = false }: { product: Product; index: number; count: number; compact?: boolean }) {
  const href = `/vault/${p.slug}`;
  const front = figureImage(p, "front");
  return (
    <>
      <Link
        href={href}
        data-cursor="view"
        className={`relative block ${compact ? "aspect-[520/640]" : "col-span-6 h-full"}`}
        aria-label={`${p.name}, view piece`}
      >
        <div aria-hidden="true" className="figure-light" />
        <div aria-hidden="true" className="figure-ground" />
        <div data-gl-hover data-gl-src={front.src} data-gl-aspect={520 / 968} className={`${front.mask} absolute inset-x-0 bottom-0 top-[6%]`}>
          <Image
            src={front.src}
            alt={viewAlt(p, "front")}
            fill
            sizes={compact ? "80vw" : "45vw"}
            className="gl-hide object-cover object-top"
          />
        </div>
      </Link>
      <div className={`flex flex-col justify-between ${compact ? "gap-6 p-5" : "col-span-6 p-[3vw]"}`}>
        <div>
          <MonoLabel as="p">
            Page {String(index + 1).padStart(2, "0")} of {String(count).padStart(2, "0")}
          </MonoLabel>
          <h3 className={`mt-4 font-extrabold uppercase leading-[0.85] tracking-[-0.045em] ${compact ? "text-[34px]" : "text-[clamp(40px,5.2vw,88px)]"}`}>
            {p.name}
          </h3>
          <MonoLabel as="p" className="mt-4">
            {placard(p.code, p.category, p.colorName)}
          </MonoLabel>
          {!compact && <p className="mt-8 max-w-md text-[18px] leading-snug text-bone">{p.constructionNote}</p>}
        </div>
        <div>
          <div className="mb-5 flex items-end justify-between gap-4">
            <p className="font-mono text-[20px] tabular-nums">{formatINR(p.price)}</p>
            <UnitCounter left={p.unitsLeft} total={p.unitsTotal} suffix="remaining" />
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <QuickAdd product={p} />
            <Link href={href} className="mono text-bone underline decoration-line underline-offset-4 hover:decoration-rust">
              View piece
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
