import { ButtonLink } from "@/components/ui/Button";
import { MonoLabel } from "@/components/ui/MonoLabel";

// TEMPORARY: holds a route until its phase is built.
export function PageStub({ label, title, line }: { label: string; title: string; line: string }) {
  return (
    <section className="gutter flex min-h-[70svh] flex-col justify-end gap-6 pb-10 pt-24">
      <MonoLabel>{label}</MonoLabel>
      <h1 className="text-[18vw] font-extrabold uppercase leading-[0.82] tracking-[-0.06em] md:text-[12vw]">{title}</h1>
      <p className="max-w-lg text-[18px] leading-snug text-bone">{line}</p>
      <div>
        <ButtonLink href="/" variant="outline">
          ← Back home
        </ButtonLink>
      </div>
    </section>
  );
}
