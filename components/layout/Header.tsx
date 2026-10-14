"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV } from "@/data/site";
import { selectCount, useCart, useCartHydrated } from "@/lib/store/cart";
import { MenuOverlay } from "./MenuOverlay";

const linkClass =
  "relative py-2 text-[13px] font-medium uppercase tracking-[0.08em] text-bone after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-rust after:transition-transform after:duration-200 hover:after:scale-x-100 aria-[current=page]:after:scale-x-100";

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:bg-bone focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ink/90 backdrop-blur-md">
        <div className="gutter flex h-[var(--header-h)] items-center justify-between">
          <Link
            href="/"
            className="text-[20px] font-extrabold uppercase leading-none tracking-[-0.045em] md:text-[22px]"
            aria-label="OUTLIVED, home"
          >
            OUTLIVED
          </Link>

          <nav aria-label="Main" className="flex items-center gap-6 md:gap-9">
            <ul className="hidden items-center gap-9 md:flex">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass} aria-current={isActive(item.href) ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <BagLink active={isActive("/bag")} />
            <button
              ref={toggleRef}
              type="button"
              className="-mr-2 px-2 py-2 text-[13px] font-medium uppercase tracking-[0.08em] md:hidden"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </nav>
        </div>
      </header>
      <MenuOverlay
        open={menuOpen}
        onClose={() => {
          setMenuOpen(false);
          toggleRef.current?.focus();
        }}
        isActive={isActive}
      />
    </>
  );
}

function BagLink({ active }: { active: boolean }) {
  const count = useCart(selectCount);
  const hydrated = useCartHydrated();
  return (
    <Link
      href="/bag"
      className={linkClass}
      aria-current={active ? "page" : undefined}
      aria-label={hydrated ? `Bag, ${count} ${count === 1 ? "item" : "items"}` : "Bag"}
    >
      Bag (<span className={`tabular-nums ${hydrated ? "" : "opacity-0"}`}>{count}</span>)
    </Link>
  );
}
