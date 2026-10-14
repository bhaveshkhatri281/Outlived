"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { INFO_LINKS, NAV, SITE } from "@/data/site";
import { getLenis } from "@/lib/motion/lenis";
import { SoundToggle } from "./SoundToggle";

type Props = {
  open: boolean;
  onClose: () => void;
  isActive: (href: string) => boolean;
};

/** Full-screen mobile menu. Sits under the header so the logo, bag and Close stay visible. */
export function MenuOverlay({ open, onClose, isActive }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    getLenis()?.stop();
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prevOverflow;
      getLenis()?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      id="site-menu"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="gutter fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 flex flex-col justify-between overflow-y-auto bg-ink pb-8 pt-10 motion-safe:animate-[menu-in_200ms_var(--ease-reveal)] md:hidden"
    >
      <ul className="flex flex-col gap-2">
        {[...NAV, { href: "/bag", label: "Bag" }].map((item, i) => (
          <li key={item.href} className="border-b border-line pb-2">
            <Link
              href={item.href}
              onClick={onClose}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="flex items-baseline gap-4 text-[13vw] font-extrabold uppercase leading-[1.05] tracking-[-0.04em] aria-[current=page]:text-rust"
            >
              <span className="mono text-ash" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-col gap-3">
        {INFO_LINKS.map((l) => (
          <Link key={l.href} href={l.href} onClick={onClose} className="mono text-bone">
            {l.label}
          </Link>
        ))}
        <a href={SITE.instagram} className="mono text-bone" target="_blank" rel="noopener noreferrer">
          Instagram ↗
        </a>
        <SoundToggle className="mt-3" />
      </div>
    </div>
  );
}
