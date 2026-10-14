import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyPanel } from "@/components/product/BuyPanel";
import { ProductCard } from "@/components/product/ProductCard";
import { Turnaround } from "@/components/product/Turnaround";
import { Accordion } from "@/components/ui/Accordion";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { HOTSPOTS } from "@/data/hotspots";
import { SITE } from "@/data/site";
import { commerce } from "@/lib/commerce";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const products = await commerce.listProducts({ status: "live" });
  return products.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await commerce.getProduct(slug);
  if (!p) return {};
  const description = `${p.name}, ${p.colorName.toLowerCase()} ${p.category.toLowerCase()} from Era ${p.era}. ${p.constructionNote}`;
  return {
    title: `${p.name} · ${p.code}`,
    description,
    alternates: { canonical: `/vault/${p.slug}` },
    openGraph: { title: `${p.name} — OUTLIVED`, description, images: [{ url: p.images.front, width: 520, height: 968 }] },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const p = await commerce.getProduct(slug);
  if (!p || p.status !== "live") notFound();
  const [related, eras] = await Promise.all([commerce.listRelated(p.slug, 4), commerce.listEras()]);
  const era = eras.find((e) => e.id === p.era)!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.code,
    image: Object.values(p.images).map((src) => new URL(src, SITE.url).toString()),
    description: p.constructionNote,
    color: p.colorName,
    category: p.category,
    brand: { "@type": "Brand", name: "OUTLIVED" },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: p.price,
      availability: p.unitsLeft > 0 ? "https://schema.org/LimitedAvailability" : "https://schema.org/SoldOut",
      url: new URL(`/vault/${p.slug}`, SITE.url).toString(),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="gutter pt-5">
        <ol className="mono flex flex-wrap gap-2 text-ash">
          <li>
            <Link href="/vault" className="text-bone hover:underline">
              Vault
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/vault?era=${p.era}`} className="text-bone hover:underline">
              Era {p.era} — {era.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{p.code}</li>
        </ol>
      </nav>

      <div className="gutter grid gap-10 overflow-x-clip pt-6 md:grid-cols-12 md:gap-8 md:pt-4">
        <section aria-label="Views" className="relative md:col-span-7">
          <div className="md:sticky md:top-[calc(var(--header-h)+16px)]">
            {/* The catalogue number, set huge behind the figure. */}
            <p
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-[18%] -z-10 hidden select-none text-center text-[17vw] font-extrabold leading-none tracking-[-0.06em] text-ink-2 md:block"
            >
              {p.code.slice(-5)}
            </p>
            <Turnaround product={p} hotspots={HOTSPOTS[p.slug] ?? []} />
          </div>
        </section>

        <section aria-label="Details" className="md:col-span-5 md:pl-[3vw] md:pt-[6vh]">
          <BuyPanel product={p}>
            <Accordion
              items={[
                {
                  title: "Built to Outlive",
                  open: true,
                  body: (
                    <dl className="grid grid-cols-[7rem_1fr] gap-y-2">
                      <dt className="mono text-ash">Fabric</dt>
                      <dd>{p.specs.fabric}</dd>
                      <dt className="mono text-ash">Weight</dt>
                      <dd>{p.specs.gsm} GSM</dd>
                      <dt className="mono text-ash">Fit</dt>
                      <dd>{p.specs.fit}</dd>
                      <dt className="mono text-ash">Care</dt>
                      <dd>{p.specs.care}</dd>
                    </dl>
                  ),
                },
                {
                  title: "Shipping & Returns",
                  body: (
                    <p>
                      {/* PLACEHOLDER */}
                      Free shipping across India, dispatched within 2 working days. Size exchanges within 7 days of delivery for
                      unworn pieces. <Link href="/info/shipping-returns" className="underline decoration-rust underline-offset-4">Full policy</Link>
                    </p>
                  ),
                },
              ]}
            />
          </BuyPanel>
        </section>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="same-era" className="mt-32 border-t border-line pt-12">
          <div className="gutter mb-10 flex items-end justify-between gap-6">
            <div>
              <MonoLabel as="p">
                Era {p.era} — {era.name}
              </MonoLabel>
              <h2 id="same-era" className="mt-3 text-[36px] font-extrabold uppercase leading-[0.9] tracking-[-0.04em] md:text-[56px]">
                From the same Era
              </h2>
            </div>
            <Link href={`/vault?era=${p.era}`} className="mono shrink-0 text-bone underline decoration-rust underline-offset-4">
              View all →
            </Link>
          </div>
          <div className="gutter no-scrollbar relative flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [contain:paint] md:grid md:grid-cols-4 md:gap-[2vw] md:overflow-visible md:[contain:none]">
            {related.map((r) => (
              <div key={r.slug} className="w-[72vw] shrink-0 snap-start md:w-auto">
                <ProductCard product={r} scale="sm" sizes="(min-width: 768px) 25vw, 72vw" headingLevel="h3" />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
