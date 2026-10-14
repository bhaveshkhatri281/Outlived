import { ButtonLink } from "@/components/ui/Button";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { commerce } from "@/lib/commerce";

// TEMPORARY (Phase 1): foundation preview. Replaced by the real home in Phase 3.
export default async function Home() {
  const products = await commerce.listProducts();

  return (
    <>
      <section className="gutter flex min-h-[calc(100svh-var(--header-h))] flex-col justify-end gap-8 pb-12 pt-16">
        <MonoLabel>Phase 1 · foundation preview</MonoLabel>
        <h1 className="text-[20vw] font-extrabold uppercase leading-[0.8] tracking-[-0.06em] md:text-[17vw]">
          Outlived
        </h1>
        <p className="max-w-xl text-[20px] font-medium leading-snug md:text-[26px]">
          Hoodies, shackets and jackets built on folds. Made for what&apos;s left{" "}
          <em className="font-serif text-[1.15em] font-normal">after the trend.</em>
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <ButtonLink href="/vault">Enter the Vault →</ButtonLink>
          <MonoLabel>{products.filter((p) => p.status === "live").length} artifacts recovered</MonoLabel>
        </div>
      </section>

    </>
  );
}
