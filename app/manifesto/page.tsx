import type { Metadata } from "next";
import Image from "next/image";
import { Statements } from "@/components/manifesto/Statements";
import { ButtonLink } from "@/components/ui/Button";
import { KineticTitle } from "@/components/ui/KineticTitle";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { commerce } from "@/lib/commerce";
import { imageSize, viewAlt } from "@/lib/images";

export const metadata: Metadata = {
  title: "Manifesto",
  description: "Why OUTLIVED exists: clothes built on folds, made in numbered runs, designed to outlast the season.",
};

// PLACEHOLDER copy: the brand story in eight short statements.
const BEFORE = [
  { text: "Most things don't last." },
  { text: "A trend is a promise with an expiry date." },
  { text: "We started with a flat sheet and one question: what survives?" },
  { text: "Folds. Pleats. Gussets. Construction you can see, touch and explain." },
];
const AFTER = [
  { text: "Every run is numbered. When it's gone, it's gone. No restocks." },
  { text: "For the few who'd rather not look like anyone else." },
  { text: "What's left when everything else is gone. That's what we make." },
  { text: "Built to outlive.", serif: true },
];

export default async function ManifestoPage() {
  const p = (await commerce.getProduct("book-jacket-wrap"))!;
  const { width, height } = imageSize(p.slug);

  return (
    <>
      <header className="gutter pb-10 pt-12 md:pt-20">
        <MonoLabel as="p" className="mb-5">
          The case for what lasts
        </MonoLabel>
        <KineticTitle text="Manifesto" className="text-[17vw] font-extrabold uppercase leading-[0.78] tracking-[-0.065em] md:text-[14vw]" />
      </header>

      <Statements lines={BEFORE} />

      {/* Interlude: one piece, held still. */}
      <figure className="gutter grid items-end gap-8 py-24 md:grid-cols-12 md:py-40">
        <div className="reveal-clip lit relative mx-auto w-full max-w-[460px] bg-plinth md:col-span-5 md:col-start-2" style={{ aspectRatio: `${width} / ${height}` }}>
          <Image src={p.images.side} alt={viewAlt(p, "side")} fill sizes="(min-width: 768px) 460px, 90vw" className="object-cover" />
        </div>
        <figcaption className="md:col-span-5 md:col-start-8">
          <MonoLabel as="p">Fig. 02 · {p.code} · Side</MonoLabel>
          <p className="mt-4 text-[22px] font-semibold leading-snug tracking-[-0.01em] md:text-[28px]">{p.constructionNote}</p>
        </figcaption>
      </figure>

      <Statements lines={AFTER} />

      <section className="gutter flex flex-col items-start gap-8 pb-10 pt-16">
        <MonoLabel as="p">21 artifacts recovered so far</MonoLabel>
        <ButtonLink href="/vault">Enter the Vault →</ButtonLink>
      </section>
    </>
  );
}
