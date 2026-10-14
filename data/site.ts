export const SITE = {
  name: "OUTLIVED",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  description:
    "OUTLIVED makes hoodies, shackets and jackets built on folds, pleats and gussets. Limited units. Made to outlast the season.", // PLACEHOLDER copy
  instagram: "https://www.instagram.com/outlived", // PLACEHOLDER handle
  email: "hello@outlived.in", // PLACEHOLDER
  whatsapp: "+91 00000 00000", // PLACEHOLDER
  /** Keep in sync with --ink in app/globals.css (browser UI colour can't read CSS variables). */
  themeColor: "#0B0B0A",
};

export const NAV = [
  { href: "/vault", label: "Vault" },
  { href: "/evidence", label: "Evidence" },
  { href: "/manifesto", label: "Manifesto" },
] as const;

export const INFO_LINKS = [
  { href: "/info/shipping-returns", label: "Shipping & Returns" },
  { href: "/info/size-guide", label: "Size Guide" },
  { href: "/info/contact", label: "Contact" },
] as const;

export const POLICY_LINKS = [
  { href: "/info/privacy", label: "Privacy" },
  { href: "/info/terms", label: "Terms" },
] as const;
