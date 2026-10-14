"use client";

import { useEffect, useRef } from "react";
import { SIZE_GUIDE } from "@/data/size-guide";
import type { Category } from "@/lib/commerce/types";
import { getLenis } from "@/lib/motion/lenis";

/** Simple size table in a native modal dialog (focus trap + Escape for free). */
export function SizeGuide({ category, open, onClose }: { category: Category; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      getLenis()?.stop();
    } else if (!open && d.open) {
      d.close();
    }
    return () => getLenis()?.start();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => {
        getLenis()?.start();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="size-guide-title"
      className="m-auto w-[min(92vw,34rem)] border border-line bg-ink-2 p-0 text-bone backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 md:p-8">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <p className="mono text-ash">{category} · cm, laid flat</p>
            <h2 id="size-guide-title" className="mt-2 text-[28px] font-extrabold uppercase leading-none tracking-[-0.03em]">
              Size guide
            </h2>
          </div>
          <button type="button" onClick={onClose} className="mono -mr-2 -mt-2 p-2 text-ash hover:text-bone" aria-label="Close size guide">
            Close ✕
          </button>
        </div>
        <table className="mono w-full border-collapse text-left text-bone">
          <thead className="text-ash">
            <tr>
              {["Size", "Chest", "Length", "Sleeve"].map((h) => (
                <th key={h} scope="col" className="border-b border-line py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SIZE_GUIDE[category].map((r) => (
              <tr key={r.size}>
                <th scope="row" className="border-b border-line py-3 font-normal">
                  {r.size}
                </th>
                <td className="border-b border-line py-3">{r.chest}</td>
                <td className="border-b border-line py-3">{r.length}</td>
                <td className="border-b border-line py-3">{r.sleeve}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-5 text-[14px] leading-snug text-ash">Every piece is cut oversized. Size down for a closer fit.</p>
      </div>
    </dialog>
  );
}
