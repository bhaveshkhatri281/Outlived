"use client";

import Link from "next/link";
import { useToast } from "@/lib/store/toast";

/** Small confirmation after Add to Bag. No forced drawer; the bag count updates in the header. */
export function Toast() {
  const toast = useToast((s) => s.toast);
  const dismiss = useToast((s) => s.dismiss);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center p-4 md:justify-end md:p-6">
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-4 border border-line bg-ink-2 px-5 py-4 motion-safe:animate-[toast-in_220ms_var(--ease-reveal)]"
          role="status"
        >
          <div>
            <p className="text-[15px] font-semibold">{toast.title}</p>
            {toast.detail && <p className="mono mt-1 text-ash">{toast.detail}</p>}
          </div>
          <div className="flex items-center gap-4">
            {toast.href && (
              <Link href={toast.href} onClick={dismiss} className="mono whitespace-nowrap text-bone underline decoration-rust underline-offset-4">
                {toast.cta ?? "View"}
              </Link>
            )}
            <button type="button" onClick={dismiss} className="mono -mr-2 p-2 text-ash hover:text-bone" aria-label="Dismiss">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
