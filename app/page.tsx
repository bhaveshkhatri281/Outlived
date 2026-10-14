import { EraChapter } from "@/components/home/EraChapter";
import { HeroMonument } from "@/components/home/HeroMonument";
import { ManifestoStrip } from "@/components/home/ManifestoStrip";
import { NextEra } from "@/components/home/NextEra";
import { UnfoldPanel } from "@/components/home/UnfoldPanel";
import { commerce } from "@/lib/commerce";

// PLACEHOLDER: which pieces open each Era chapter (4 per Era).
const FEATURED: Record<string, string[]> = {
  "01": ["envelope-basin", "soft-tessellation", "turned-leaf", "miter-stack"],
  "02": ["air-bell", "screen-lantern", "loft-ribbon", "air-bloom"],
};

export default async function Home() {
  const [eras, products] = await Promise.all([commerce.listEras(), commerce.listProducts()]);
  const hero = products.find((p) => p.slug === "book-jacket-wrap")!;
  const chapter = (id: "01" | "02") => {
    const era = eras.find((e) => e.id === id)!;
    const inEra = products.filter((p) => p.era === id);
    const featured = FEATURED[id].map((s) => inEra.find((p) => p.slug === s)).filter((p) => !!p);
    return <EraChapter era={era} featured={featured} total={inEra.length} />;
  };

  return (
    <>
      <HeroMonument product={hero} />
      <ManifestoStrip />
      {chapter("01")}
      <UnfoldPanel />
      {chapter("02")}
      <NextEra pieces={products.filter((p) => p.status === "upcoming")} />
    </>
  );
}
