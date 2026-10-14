import type { ReactNode } from "react";

/** Native <details> accordion: keyboard and screen-reader friendly with zero JS. */
export function Accordion({ items }: { items: { title: string; body: ReactNode; open?: boolean }[] }) {
  return (
    <div className="border-t border-line">
      {items.map((item) => (
        <details key={item.title} open={item.open} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[15px] font-semibold uppercase tracking-[0.04em] [&::-webkit-details-marker]:hidden">
            {item.title}
            <span aria-hidden="true" className="mono text-ash transition-transform duration-200 group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="pb-6 text-[15px] leading-relaxed text-bone">{item.body}</div>
        </details>
      ))}
    </div>
  );
}
