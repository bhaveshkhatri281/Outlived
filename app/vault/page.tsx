import type { Metadata } from "next";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { KineticTitle } from "@/components/ui/KineticTitle";
import { VaultGrid } from "@/components/vault/VaultGrid";
import { commerce } from "@/lib/commerce";

export const metadata: Metadata = {
  title: "The Vault",
  description: "Every OUTLIVED artifact currently recovered: hoodies, shackets and jackets in numbered units.",
};

export default async function VaultPage() {
  const [products, eras] = await Promise.all([commerce.listProducts({ status: "live" }), commerce.listEras()]);
  const live = eras.filter((e) => e.status === "live");

  return (
    <>
      <header className="gutter grid gap-8 pb-10 pt-12 md:grid-cols-12 md:items-end md:pb-14 md:pt-20">
        <div className="md:col-span-8">
          <MonoLabel as="p" className="mb-5">
            Index of recovered artifacts
          </MonoLabel>
          <KineticTitle
            text="The Vault"
            className="text-[24vw] font-extrabold uppercase leading-[0.78] tracking-[-0.065em] md:text-[15vw]"
          />
        </div>
        <dl className="mono grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 md:col-span-4 md:justify-self-end">
          {live.map((e) => (
            <div key={e.id} className="contents">
              <dt className="text-ash">Era {e.id}</dt>
              <dd className="text-bone">
                {e.name} · {products.filter((p) => p.era === e.id).length} pieces
              </dd>
            </div>
          ))}
          <dt className="text-ash">Units</dt>
          <dd className="text-bone">Numbered. Never restocked.</dd>
        </dl>
      </header>
      <VaultGrid products={products} />
    </>
  );
}
