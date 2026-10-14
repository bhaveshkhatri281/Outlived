import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FoldReveal } from "@/components/ui/FoldReveal";
import { KineticTitle } from "@/components/ui/KineticTitle";
import { MonoLabel, placard } from "@/components/ui/MonoLabel";
import { commerce } from "@/lib/commerce";
import type { Product } from "@/lib/commerce/types";
import { viewAlt } from "@/lib/images";

export const metadata: Metadata = {
  title: "Evidence",
  description: "The OUTLIVED lookbook: film stills of every recovered artifact, each linked to the piece.",
};

// PLACEHOLDER: product panoramas stand in until real lookbook photography exists.
const EXHIBITS: { era: "01" | "02"; items: ({ kind: "wide"; slug: string } | { kind: "pair"; slug: string })[] }[] = [
  {
    era: "01",
    items: [
      { kind: "wide", slug: "book-jacket-wrap" },
      { kind: "wide", slug: "turned-leaf" },
      { kind: "pair", slug: "parallel-turn" },
      { kind: "wide", slug: "pleated-hem-wings" },
      { kind: "wide", slug: "overfold-pavement" },
      { kind: "wide", slug: "concertina-saddle" },
    ],
  },
  {
    era: "02",
    items: [
      { kind: "wide", slug: "air-bell" },
      { kind: "pair", slug: "mesh-cocoon" },
      { kind: "wide", slug: "screen-lantern" },
    ],
  },
];

export default async function EvidencePage() {
  const [products, eras] = await Promise.all([commerce.listProducts({ status: "live" }), commerce.listEras()]);
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  let n = 0;

  return (
    <>
      <header className="gutter pb-16 pt-12 md:pb-24 md:pt-20">
        <MonoLabel as="p" className="mb-5">
          Film stills from the archive
        </MonoLabel>
        <KineticTitle text="Evidence" className="text-[24vw] font-extrabold uppercase leading-[0.78] tracking-[-0.065em] md:text-[16vw]" />
        <p className="mt-8 max-w-md text-[18px] leading-snug">Proof that these pieces survived. Every still links to its artifact.</p>
      </header>

      {EXHIBITS.map((section) => {
        const era = eras.find((e) => e.id === section.era)!;
        return (
          <section key={section.era} aria-labelledby={`evidence-era-${section.era}`} className="pb-16">
            <FoldReveal className="border-y border-line bg-ink-2">
              <div className="gutter flex flex-wrap items-end justify-between gap-6 py-10 md:py-14">
                <h2 id={`evidence-era-${section.era}`} className="text-[13vw] font-extrabold uppercase leading-[0.82] tracking-[-0.06em] md:text-[7vw]">
                  Era {era.id} — {era.name}
                </h2>
                <MonoLabel>{era.line}</MonoLabel>
              </div>
            </FoldReveal>

            <div className="flex flex-col gap-24 pt-20 md:gap-36 md:pt-28">
              {section.items.map((item) => {
                const p = bySlug.get(item.slug);
                if (!p) return null;
                n += 1;
                return item.kind === "wide" ? <Wide key={p.slug} product={p} n={n} /> : <Pair key={p.slug} product={p} n={n} />;
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

function Caption({ product: p, n, views }: { product: Product; n: number; views: string }) {
  return (
    <div className="gutter mt-5 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
      <MonoLabel tone="bone">{placard(`Exhibit ${String(n).padStart(2, "0")}`, p.name, p.code)}</MonoLabel>
      <MonoLabel>{views}</MonoLabel>
      <Link href={`/vault/${p.slug}`} className="mono text-bone underline decoration-rust underline-offset-4">
        View artifact →
      </Link>
    </div>
  );
}

function Wide({ product: p, n }: { product: Product; n: number }) {
  return (
    <figure>
      <Link
        href={`/vault/${p.slug}`}
        data-cursor="view"
        data-gl-hover
        data-gl-src={`/editorial/unfold-${p.slug}.webp`}
        data-gl-aspect={1560 / 697}
        className="reveal-clip relative block w-full bg-plinth"
        style={{ aspectRatio: "1560 / 697" }}
      >
        <Image src={`/editorial/unfold-${p.slug}.webp`} alt={`${p.name} shown front, side and back`} fill sizes="100vw" className="gl-hide object-cover" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 90% at 50% 45%, transparent 60%, color-mix(in oklab, var(--ink) 90%, transparent) 100%)" }}
        />
        <span aria-hidden="true" className="mono absolute left-[var(--gutter)] top-4 text-bone">
          F.{String(n).padStart(2, "0")}
        </span>
        <span aria-hidden="true" className="mono absolute right-[var(--gutter)] top-4 text-bone">
          00:00:{String(n * 7).padStart(2, "0")}:{String((n * 13) % 24).padStart(2, "0")}
        </span>
      </Link>
      <Caption product={p} n={n} views="Front · Side · Back" />
    </figure>
  );
}

function Pair({ product: p, n }: { product: Product; n: number }) {
  return (
    <figure>
      <div className="gutter grid grid-cols-2 gap-3 md:mx-auto md:max-w-[1100px] md:gap-6">
        {(["side", "back"] as const).map((v, i) => (
          <Link
            key={v}
            href={`/vault/${p.slug}`}
            data-cursor="view"
            data-gl-hover
            data-gl-src={p.images[v]}
            data-gl-aspect={520 / 968}
            className={`reveal-clip lit relative block bg-plinth ${i === 1 ? "md:mt-24" : ""}`}
            style={{ aspectRatio: "520 / 760" }}
          >
            <Image src={p.images[v]} alt={viewAlt(p, v)} fill sizes="(min-width: 768px) 520px, 50vw" className="gl-hide object-cover object-top" />
          </Link>
        ))}
      </div>
      <Caption product={p} n={n} views="Side · Back" />
    </figure>
  );
}
