import Link from "next/link";
import { INFO_LINKS, NAV, POLICY_LINKS, SITE } from "@/data/site";

const colTitle = "mono mb-4 text-ash";
const colLink = "mono inline-block py-1 text-bone decoration-rust underline-offset-4 hover:underline";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-line">
      <div className="gutter grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <p className="max-w-[16rem] text-[15px] leading-snug text-bone">
            Hoodies, shackets and jackets built on folds. Limited units, never restocked.
            {/* PLACEHOLDER copy */}
          </p>
        </div>

        <nav aria-label="Archive">
          <p className={colTitle}>Archive</p>
          <ul className="flex flex-col gap-1.5">
            {NAV.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={colLink}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Help">
          <p className={colTitle}>Help</p>
          <ul className="flex flex-col gap-1.5">
            {INFO_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={colLink}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className={colTitle}>Elsewhere</p>
          <ul className="flex flex-col gap-1.5">
            <li>
              <a href={SITE.instagram} className={colLink} target="_blank" rel="noopener noreferrer">
                Instagram ↗
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className={colLink}>
                {SITE.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="gutter flex flex-col gap-3 border-t border-line py-6 md:flex-row md:items-center md:justify-between">
        <p className="mono text-ash">© {new Date().getFullYear()} OUTLIVED · Made in India {/* PLACEHOLDER */}</p>
        <ul className="flex gap-6">
          {POLICY_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={colLink}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <p
        aria-hidden="true"
        className="select-none overflow-hidden whitespace-nowrap text-center text-[23vw] font-extrabold uppercase leading-[0.72] tracking-[-0.06em] text-ink-2"
      >
        OUTLIVED
      </p>
    </footer>
  );
}
