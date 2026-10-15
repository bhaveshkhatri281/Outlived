import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FoldReveal } from "@/components/ui/FoldReveal";
import { KineticTitle } from "@/components/ui/KineticTitle";
import { MonoLabel, placard } from "@/components/ui/MonoLabel";
import { commerce } from "@/lib/commerce";
import type { Product, ProductView } from "@/lib/commerce/types";
import { figureImage, imageSize, viewAlt } from "@/lib/images";

export const metadata: Metadata = {
  title: "Evidence",
  description: "The OUTLIVED lookbook: film stills of every recovered artifact, each linked to the piece.",
};

// PLACEHOLDER: replace with real lookbook photography. Until then each exhibit is one product
// view (front, side and back alternate), cropped as a film still.
const EXHIBITS: { era: "01" | "02"; items: { slug: string; view: ProductView }[] }[] = [
  {
    era: "01",
    items: [
      { slug: "book-jacket-wrap", view: "front" },
      { slug: "turned-leaf", view: "side" },
      { slug: "parallel-turn", view: "back" },
      { slug: "pleated-hem-wings", view: "front" },
      { slug: "overfold-pavement", view: "side" },
      { slug: "concertina-saddle", view: "back" },
    ],
  },
  {
    era: "02",
    items: [
      { slug: "air-bell", view: "front" },
      { slug: "mesh-cocoon", view: "side" },
      { slug: "screen-lantern", view: "back" },
    ],
  },
];

export default async function EvidencePage() {
  const [products, eras] = await Promise.all([commerce.listProducts({ status: "live" }), commerce.listEras()]);
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  let n = 0;

  return (
    <>
      <header className="gutter pb-12 pt-12 md:pb-16 md:pt-20">
        <MonoLabel as="p" className="mb-5">
          Film stills from the archive
        </MonoLabel>
        <KineticTitle text="Evidence" className="text-[20vw] font-extrabold uppercase leading-[0.78] tracking-[-0.065em] md:text-[16vw]" />
        <p className="mt-8 max-w-md text-[18px] leading-snug">Proof that these pieces survived. Every still links to its artifact.</p>
      </header>

      {EXHIBITS.map((section) => {
        const era = eras.find((e) => e.id === section.era)!;
        return (
          <section key={section.era} aria-labelledby={`evidence-era-${section.era}`} className="pb-[10vh] md:pb-[14vh]">
            <FoldReveal className="border-y border-line bg-ink-2">
              <div className="gutter flex flex-wrap items-end justify-between gap-6 py-10 md:py-14">
                <h2 id={`evidence-era-${section.era}`} className="text-[13vw] font-extrabold uppercase leading-[0.82] tracking-[-0.06em] md:text-[7vw]">
                  Era {era.id} — {era.name}
                </h2>
                <MonoLabel>{era.line}</MonoLabel>
              </div>
            </FoldReveal>

            <div className="flex flex-col gap-[10vh] pt-[8vh] md:gap-[14vh] md:pt-[12vh]">
              {section.items.map((item) => {
                const p = bySlug.get(item.slug);
                if (!p) return null;
                n += 1;
                return <Still key={p.slug} product={p} view={item.view} n={n} priority={n === 1} />;
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

/** One exhibit: a single view, cropped as a film still (4:5 phones, 3:2 desktop), standing in its own light. */
function Still({ product: p, view, n, priority }: { product: Product; view: ProductView; n: number; priority: boolean }) {
  const { width, height } = imageSize(p.slug);
  const fig = figureImage(p, view);
  return (
    <figure className="md:mx-auto md:w-[64vw]">
      <Link href={`/vault/${p.slug}`} data-cursor="view" className="reveal-clip relative block aspect-[4/5] md:aspect-[3/2]">
        <div aria-hidden="true" className="figure-light" />
        <div aria-hidden="true" className="figure-ground" />
        <div data-gl-hover data-gl-src={fig.src} data-gl-aspect={width / height} className={`${fig.mask} absolute inset-x-0 bottom-0 top-[12%]`}>
          <Image
            src={fig.src}
            alt={viewAlt(p, view)}
            fill
            sizes="(min-width: 768px) 64vw, 100vw"
            priority={priority}
            className="gl-hide object-cover object-top"
          />
        </div>
        <span aria-hidden="true" className="mono absolute left-[8%] top-[5%] text-bone">
          F.{String(n).padStart(2, "0")}
        </span>
        <span aria-hidden="true" className="mono absolute right-[8%] top-[5%] text-bone">
          00:00:{String(n * 7).padStart(2, "0")}:{String((n * 13) % 24).padStart(2, "0")}
        </span>
      </Link>
      <figcaption className="gutter mt-5 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 md:px-0">
        <MonoLabel tone="bone">{placard(`Exhibit ${String(n).padStart(2, "0")}`, p.name, p.code)}</MonoLabel>
        <MonoLabel>{view}</MonoLabel>
        <Link href={`/vault/${p.slug}`} className="mono text-bone underline decoration-rust underline-offset-4">
          View artifact →
        </Link>
      </figcaption>
    </figure>
  );
}
