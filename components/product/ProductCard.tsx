"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { MonoLabel, placard } from "@/components/ui/MonoLabel";
import { formatINR } from "@/lib/commerce/format";
import { VIEWS, type Product } from "@/lib/commerce/types";
import { imageSize, viewAlt } from "@/lib/images";
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
      <Link href={href} onClick={onClick} data-cursor="view" data-shared className="block focus-visible:outline-offset-8">
        <div
          ref={frameRef}
          data-gl-hover
          data-gl-src={p.images[VIEWS[view]]}
          data-gl-aspect={width / height}
          onPointerMove={onMove}
          onPointerLeave={() => setView(0)}
          className="reveal-clip lit relative bg-plinth"
          style={{ aspectRatio: CARD_ASPECT }}
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
                src={p.images[v]}
                alt={viewAlt(p, v)}
                width={width}
                height={height}
                sizes={sizes}
                priority={priority && i === 0}
                loading={priority && i === 0 ? undefined : "lazy"}
                className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-200 touch:relative touch:shrink-0 touch:snap-center touch:opacity-100 ${
                  view === i ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 hidden justify-center gap-1.5 touch:flex" aria-hidden="true">
            {VIEWS.map((v, i) => (
              <span key={v} className={`h-1 w-1 rounded-full ${swipe === i ? "bg-bone" : "bg-ash/60"}`} />
            ))}
          </div>
        </div>
        <p className="mono mt-3 hidden gap-3 pointer-fine:flex" aria-hidden="true">
          {VIEWS.map((v, i) => (
            <span key={v} className={view === i ? "text-bone" : "text-ash"}>
              {v}
            </span>
          ))}
        </p>

        <div className="mt-3 flex items-start justify-between gap-4 touch:mt-4">
          <div className="min-w-0">
            <Heading className={`${NAME_SIZE[scale]} font-bold uppercase leading-[0.95] tracking-[-0.03em]`}>{p.name}</Heading>
            <MonoLabel as="p" className="mt-2">
              {placard(p.code, `Era ${p.era}`, p.category)}
            </MonoLabel>
          </div>
          <p className="mono shrink-0 pt-1 text-[13px] text-bone">{formatINR(p.price)}</p>
        </div>
        <UnitCounter left={p.unitsLeft} total={p.unitsTotal} suffix="remaining" className="mt-3" />
      </Link>
    </article>
  );
}
