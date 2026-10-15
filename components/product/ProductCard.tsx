"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { MonoLabel, placard } from "@/components/ui/MonoLabel";
import { formatINR } from "@/lib/commerce/format";
import { VIEWS, type Product } from "@/lib/commerce/types";
import { figureImage, imageSize, viewAlt } from "@/lib/images";
import { navigateShared } from "@/lib/transition/shared";
import { UnitCounter } from "./UnitCounter";

export type CardScale = "xl" | "md" | "sm";

/** Cards frame head to mid-thigh (the garment is the product); the Exhibit shows the full figure. */
const CARD_ASPECT = "520 / 700";

const NAME_SIZE: Record<CardScale, string> = {
  xl: "text-[26px] md:text-[34px]",
  md: "text-[22px] md:text-[24px]",
  sm: "text-[20px]",
};

type Props = {
  product: Product;
  scale?: CardScale;
  sizes: string;
  priority?: boolean;
  /** Keep the page's heading outline in order (h2 in the Vault, h3 under a section heading). */
  headingLevel?: "h2" | "h3";
};

/**
 * Vault card. Desktop: moving across the image scrubs front → side → back.
 * Touch: the three views swipe horizontally, with dots.
 * Click: the image flies into the product page (shared-element transition).
 */
export function ProductCard({ product: p, scale = "md", sizes, priority = false, headingLevel: Heading = "h2" }: Props) {
  const router = useRouter();
  const [view, setView] = useState(0);
  const [swipe, setSwipe] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const href = `/vault/${p.slug}`;
  const { width, height } = imageSize(p.slug);
  const figures = VIEWS.map((v) => figureImage(p, v));

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    setView(Math.min(2, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * 3))));
  };

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !frameRef.current) return;
    e.preventDefault();
    navigateShared(href, frameRef.current, router.push);
  };

  return (
    <article className="group/card">
      <Link href={href} onClick={onClick} data-cursor="view" data-shared className="relative block focus-visible:outline-offset-8">
        <div
          onPointerMove={onMove}
          onPointerLeave={() => setView(0)}
          // Phones: never taller than ~70vh.
          className="reveal-clip relative max-md:max-h-[70vh]"
          style={{ aspectRatio: CARD_ASPECT }}
        >
          <div aria-hidden="true" className="figure-light" />
          <div aria-hidden="true" className="figure-ground" />
          {/* The figure, with headroom for the light above it (also the hover-canvas and shared-transition target). */}
          <div
            ref={frameRef}
            data-gl-hover
            data-gl-src={figures[view].src}
            data-gl-aspect={width / height}
            className={`${figures[0].mask} absolute inset-x-0 bottom-0 top-[6%]`}
          >
          {/* One image set: stacked and scrubbed by the pointer on desktop, a swipe row on touch. */}
          <div
            className="gl-hide no-scrollbar absolute inset-0 touch:flex touch:snap-x touch:snap-mandatory touch:overflow-x-auto"
            onScroll={(e) => {
              const el = e.currentTarget;
              setSwipe(Math.round(el.scrollLeft / el.clientWidth));
            }}
          >
            {VIEWS.map((v, i) => (
              <Image
                key={v}
                src={figures[i].src}
                alt={viewAlt(p, v)}
                width={width}
                height={height}
                sizes={sizes}
                // First card: eager, but without a <link rel=preload>. React 19 adds one for every eager
                // <img> unless fetchPriority is "low", and on desktop (first cards at the fold) Chrome flagged it
                // as unused when the image was already cached from the homepage. The <img> is in the server
                // HTML, so the preload scanner finds it at once, and Chrome raises in-viewport images to high
                // priority after layout, so the phone LCP card still loads first.
                loading={priority && i === 0 ? "eager" : "lazy"}
                fetchPriority={priority && i === 0 ? "low" : undefined}
                className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-200 touch:relative touch:shrink-0 touch:snap-center touch:opacity-100 ${
                  view === i ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 hidden justify-center gap-1.5 touch:flex max-md:bottom-auto max-md:top-3" aria-hidden="true">
            {VIEWS.map((v, i) => (
              <span key={v} className={`h-1 w-1 rounded-full ${swipe === i ? "bg-bone" : "bg-ash/60"}`} />
            ))}
          </div>
        </div>
        <p className="mono mt-3 hidden gap-3 md:pointer-fine:flex" aria-hidden="true">
          {VIEWS.map((v, i) => (
            <span key={v} className={view === i ? "text-bone" : "text-ash"}>
              {v}
            </span>
          ))}
        </p>

        {/* Phones: overlaid on the bottom of the image (ink gradient keeps it readable), so a
            product's image, name and price fit in one screen. Desktop: below the image, as before. */}
        <div className="max-md:pointer-events-none max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:bg-linear-to-t max-md:from-ink/85 max-md:via-ink/60 max-md:to-transparent max-md:px-4 max-md:pb-4 max-md:pt-20">
          <div className="flex items-start justify-between gap-4 md:mt-3">
            <div className="min-w-0">
              <Heading className={`${NAME_SIZE[scale]} font-bold uppercase leading-[0.95] tracking-[-0.03em]`}>{p.name}</Heading>
              <MonoLabel as="p" className="mt-2">
                {placard(p.code, `Era ${p.era}`, p.category)}
              </MonoLabel>
            </div>
            <p className="mono shrink-0 pt-1 text-[13px] text-bone">{formatINR(p.price)}</p>
          </div>
          <UnitCounter left={p.unitsLeft} total={p.unitsTotal} suffix="remaining" className="mt-3" />
        </div>
      </Link>
    </article>
  );
}
