import { ButtonLink } from "@/components/ui/Button";
import { MonoLabel } from "@/components/ui/MonoLabel";

export default function NotFound() {
  return (
    <section className="gutter flex min-h-[70svh] flex-col justify-end gap-6 pb-10 pt-24">
      <MonoLabel>Error 404 · No record</MonoLabel>
      <h1 className="text-[16vw] font-extrabold uppercase leading-[0.82] tracking-[-0.06em] md:text-[10vw]">
        Not recovered
      </h1>
      <p className="max-w-lg text-[18px] leading-snug">This page didn&apos;t survive. The artifacts that did are in the Vault.</p>
      <div>
        <ButtonLink href="/vault">Enter the Vault →</ButtonLink>
      </div>
    </section>
  );
}
