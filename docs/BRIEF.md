# OUTLIVED — Website Build Brief for Claude Code

You are building the e-commerce website for **OUTLIVED**, a premium Indian clothing brand (hoodies, sweatshirts, shackets, jackets) for the top ~1% of buyers who want something nobody else is wearing. The brand idea is "go out of the box".

**What you are building:** an e-commerce store, built creatively. People must be able to browse, understand and buy without friction. The creativity serves the product and never competes with it.

Read this whole brief before writing code. Work in the phases at the bottom, and stop for my review after each phase.

---

## 1. The concept: "The Archive"

OUTLIVED means **what's left after everything else is gone**. The site feels like an archive from the future, where the garments are the artifacts that survived.

- Products are **artifacts**. Each has a catalog code (e.g. `OTL-D07-35`), a name, and an Era.
- The shop is **The Vault**. Collections are **Eras**. The lookbook is **Evidence**.
- The clothes are built on **folds, pleats, overfolds and gussets**. The site's signature motion mirrors that: panels **fold and unfold**, like turning archive pages.
- Every product photo shows a **faceless model** (black balaclava, black backdrop, washed baggy grey denim). This figure is the brand's face. Keep the site dark so the photos blend into it seamlessly.

---

## 2. Non-negotiable UX rules (read twice)

The #1 risk is a site that looks amazing but confuses people. Follow these rules over any visual idea.

1. **5-second test.** Within 5 seconds of landing on any page, a first-time visitor knows (a) this is a clothing brand, (b) roughly what the clothes look like, and (c) where to click next. A product image and a clear CTA are visible on first paint.
2. **Normal controls, special visuals.** Native scroll (smooth via Lenis, but never hijacked, locked, or turned horizontal on the main axis). The header and menu are always visible at the top. Buttons look like buttons. No mystery-meat navigation.
3. **The animation dial:**
   - Home: 8/10 (the wow lives here)
   - Vault / shop: 5/10
   - Product page: 3/10
   - Cart and checkout: 0/10 (plain, fast, zero animation)
4. **Never make people wait.** No unskippable intro. Content is interactive in under 2.5s on a mid-range Android over 4G.
5. **One new gesture per page, labelled.** For example, the product turnaround shows a "← drag to turn →" hint the first time.
6. **Price, name and Add to Bag are never more than one scroll away** on product pages.
7. **Every animation must either show the product better or move the user forward.** If it does neither, cut it.
8. **`prefers-reduced-motion`:** all scroll and transition effects degrade to simple fades.
9. **Mobile first.** Design and test at 390px wide first, then scale up. Most traffic will be phones in India.

---

## 3. Visual system

**Theme: dark only for v1.** The whole site is a premium dark theme. Do not build a light mode or a theme toggle yet. However, define every colour as a CSS variable under `:root[data-theme="dark"]` (set `data-theme="dark"` on `<html>`), and never hard-code hex values in components. That way a light or alternate theme can be added later by adding one token block plus a toggle.

**Making dark feel premium, not just black:**

- Layer near-blacks (`--ink`, `--ink-2`) instead of flat `#000`.
- Use soft vignettes around product images so they melt into the background.
- Add very subtle film grain (an SVG noise overlay at 3–4% opacity).
- Keep bone text slightly warm, never pure white.
- Use rust sparingly so it feels expensive.

**Colour tokens (CSS variables):**

```
--ink:    #0B0B0A   /* page background, near-black (matches photo backdrop) */
--ink-2:  #151513   /* raised surfaces, cards */
--bone:   #ECE6DA   /* primary text, light surfaces */
--ash:    #8A867E   /* secondary text, borders */
--line:   #2A2925   /* hairlines */
--rust:   #B4532A   /* single accent: CTAs, active states, unit counters */
```

The garments supply all other colour. Never add other accent colours.

**Type (Google Fonts):**

- Display and UI: **Inter Tight** (600–800 for headlines, tight tracking, often uppercase; 400–500 for UI)
- Catalog data (codes, specs, unit counts, prices): **JetBrains Mono** (400), uppercase, letter-spaced
- Manifesto accent: **Instrument Serif** italic (used sparingly, at most 1–2 phrases per page)

**Style:**

- Huge type, generous black space, thin 1px hairlines in `--line`
- Museum-placard detailing: small mono labels like `OTL-D07-35 · ERA 01 · UNIT 047/150`
- Sharp corners (0–2px radius), no drop shadows, no gradients except subtle vignettes
- Custom cursor on desktop only: a small bone dot that grows into a ring labelled "VIEW" over products. It is hidden on touch devices.

---

## 4. Tech stack

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS**
- **GSAP + ScrollTrigger** for scroll animation, **Lenis** for smooth scroll
- **Zustand** for cart state (persisted to localStorage, wrapped in try/catch)
- **next/image** with AVIF/WebP for all imagery
- **Commerce adapter pattern.** All product, cart and checkout calls go through `lib/commerce/` with one interface. Phase 1 uses a **local adapter** (product data from `data/products.ts`). Later we will plug in **Shopify Storefront API** or **Razorpay** without touching UI code. Do not hard-wire any provider.
- No React Three Fiber in v1. Use CSS 3D transforms and GSAP for the fold effects. A true 3D garment may come later.

---

## 5. Product assets: split the triptychs first

Product images are in `/raw-products/` (I will copy them in). **Each PNG is a 1536×1024 triptych with three panels left to right: FRONT, SIDE, BACK**, each ~512px wide, with small labels at the bottom.

Write `scripts/split-products.ts` using **sharp** to:

1. Split each image into three equal vertical panels: `front`, `side`, `back`.
2. Trim the small label strip at the bottom if present (inspect a sample and adjust the crop).
3. Export each panel as AVIF and WebP into `/public/products/<slug>/{front,side,back}.{avif,webp}`.
4. Print a summary. Show me 2 sample outputs before batch-processing everything.

**Filename pattern:** `HD2_D07_M35_book_jacket_wrap.png` gives category `HD2` (hoodie) / `SH2` (shacket) / `JK2` (jacket), drop `D07`, model `M35`, and name `book jacket wrap`. Catalog code is `OTL-D07-35`.

---

## 6. Product data (`data/products.ts`)

```ts
type Product = {
  slug: string;            // "book-jacket-wrap"
  code: string;            // "OTL-D07-35"
  name: string;            // "Book Jacket Wrap"
  category: "Hoodie" | "Shacket" | "Jacket";
  era: "01" | "02" | "03";
  status: "live" | "upcoming";
  price: number;           // INR — PLACEHOLDER, I will update
  unitsTotal: number;      // e.g. 150 — PLACEHOLDER
  unitsLeft: number;       // PLACEHOLDER
  sizes: ("S"|"M"|"L"|"XL"|"XXL")[];
  colorName: string;       // e.g. "Dusk Mauve"
  constructionNote: string;// 1–2 lines on the fold and why it exists
  specs: { fabric: string; gsm: number; fit: string; care: string }; // PLACEHOLDER
  images: { front: string; side: string; back: string };
};
```

**Era 01 — "The Fold" (status: live).** Origami pleats, overfolds, gussets.

Hoodies:

| Code | Name | Colour |
| --- | --- | --- |
| OTL-D07-01 | Envelope Basin | bone |
| OTL-D07-02 | Concertina Shoulders | sea teal |
| OTL-D07-08 | Folded Saddle | sand |
| OTL-D07-11 | Parchment Gusset | stone / olive inserts |
| OTL-D07-13 | Soft Tessellation | sage |
| OTL-D07-22 | Folded Apron | olive |
| OTL-D07-24 | Stepped Shelf | lavender |
| OTL-D07-27 | Pleated Hem Wings | taupe / plum lining |
| OTL-D07-33 | Turned Page Sleeves | apricot / rust |
| OTL-D07-35 | Book Jacket Wrap | dusk mauve |

Shackets:

| Code | Name | Colour |
| --- | --- | --- |
| OTL-S07-02 | Concertina Saddle | rust / teal collar |
| OTL-S07-03 | Miter Stack | bone |
| OTL-S07-05 | Parallel Turn | navy |
| OTL-S07-06 | Pleat Exchange | camel |
| OTL-S07-28 | Overfold Pavement | moss |
| OTL-S07-31 | Turned Leaf | chocolate / sand |

**Era 02 — "Air" (status: live).** Mesh, texture, volume. Jackets:

| Code | Name | Colour |
| --- | --- | --- |
| OTL-J08-01 | Air Bell | lilac |
| OTL-J08-06 | Mesh Cocoon | sand |
| OTL-J08-10 | Screen Lantern | bone / black piping |
| OTL-J08-14 | Loft Ribbon | petrol blue |
| OTL-J08-15 | Air Bloom | ivory / grey |

**Era 03 — "Liquid" (status: upcoming).** Teased in "Next Era", not purchasable:

- OTL-D02-01 Mercury Tide
- OTL-D02-05 Capillary Flow

**Excluded (do not import):** Poured Type, Silt and Sheen, Vent Contour, Porous Waist.

Write a short, specific `constructionNote` for each based on its name and look (e.g. Book Jacket Wrap: "A front panel wraps across the chest like a dust jacket and pins at the hip."). Mark all prices and specs as `// PLACEHOLDER`. Use ₹4,999–₹8,999 as dummy prices.

---

## 7. Site map and pages

**Header (every page, always visible):**

- Left: `OUTLIVED` wordmark
- Right: `Vault` · `Evidence` · `Manifesto` · `Bag (n)`
- On mobile, a menu button opens a full-screen overlay. The bag count is always visible.

### 7.1 Entry gate (first visit only)

- Black screen with one centred line, *"Most things don't last."*, and a **press-and-hold button** ("HOLD TO ENTER") that fills in rust over **1.2s**, then the gate folds away (top and bottom halves fold back in 3D).
- A visible "skip" text link.
- Remember with localStorage (try/catch) so returning visitors never see it. Never show it to crawlers (render it client-side only).

### 7.2 Home

1. **Hero — "The Turnaround"** (v1)
   - The faceless figure in **Book Jacket Wrap** is centred, with `OUTLIVED` set huge behind it, partly hidden by the figure.
   - As the user scrolls the first ~100vh, the figure crossfades **front → side → back** (pinned with ScrollTrigger, scrubbed).
   - Mono caption bottom-left: `OTL-D07-35 · BOOK JACKET WRAP · ERA 01`.
   - A visible CTA from first paint: **"Enter the Vault →"**. A scroll hint sits bottom-centre.
   - Mobile: same effect at a shorter pin distance (~60vh).
2. **Manifesto strip:** 3 lines of giant type revealed word-by-word on scroll:
   - "Trends die in a season."
   - "We make what's left behind."
   - "*Built to outlive.*"
3. **Era 01 — The Fold:** section title with a short line, then a horizontal row of 4 featured pieces that turn on hover. "View all of Era 01 →".
4. **The Unfold moment:** a full-width panel that starts creased into 4 strips (CSS 3D, rotateX) and **unfolds** flat on scroll, revealing a large lifestyle image or a close-up of a pleat. This is the signature effect: make it buttery and keep it short.
5. **Era 02 — Air:** same pattern as Era 01.
6. **Next Era teaser:** blurred and darkened Mercury Tide / Capillary Flow, the line "Era 03 is being recovered.", a countdown placeholder, and a **WhatsApp / phone number waitlist** field (validate a 10-digit Indian number; store locally for now and log it to the console; adapter stub for a backend later).
7. **Footer:** small mono text, Instagram, contact, shipping and returns, size guide, and policies.

### 7.3 The Vault (`/vault`)

- Filter chips: `All` · `Era 01` · `Era 02` (plus small secondary category chips: Hoodie / Shacket / Jacket). Filtering animates items with a quick fade or reflow, not a big show.
- Grid: 2 columns on desktop with huge cards, 1 column on mobile.
- Each card shows the front image, plus:
  - **Desktop:** hovering shows side; moving the cursor left or right across the card scrubs front → side → back.
  - **Mobile:** swipe through the three views (with dots).
- Card text: name, code and Era (mono), price, and a rust `UNIT 047 / 150` counter.
- Clicking a card opens the product page with a **shared-element transition**: the image expands into the product page hero (View Transitions API with a graceful fallback).

### 7.4 Product page (`/vault/[slug]`)

**Layout:** images left (60%) and a sticky info column right (40%). On mobile, images come first, then info.

- **Turnaround viewer:** front/side/back, draggable on desktop and swipeable on mobile, with "← drag to turn →" shown once. Thumbnails below.
- A **video slot** (6s loop, muted, autoplay, playsinline). Use a placeholder if there's no video yet. It is hidden if missing.

**Info column:**

- Mono line: `OTL-D07-35 · ERA 01 · HOODIE`
- Name (large), then price
- Unit counter: `UNIT 047 / 150 REMAINING`
- Size selector (S–XXL) with a "Size guide" link that opens a simple modal table
- **Add to Bag**: full width, rust. On add, show a small toast plus an updated bag count. No forced cart drawer.
- **Construction note:** 1–2 lines in Instrument Serif italic
- Accordion: `Built to Outlive` (fabric, GSM, fit, care), `Shipping & Returns`

**Sticky mobile bar** (appears after scrolling past the Add to Bag button): price and Add to Bag.

**"From the same Era":** a row of 3–4 other products.

### 7.5 Bag (`/bag`) and checkout

- **0/10 animation.** Clean list: line items, size, quantity stepper, remove, subtotal in INR, and an estimated shipping note.
- The "Checkout" button calls `commerce.checkout(cart)`. The local adapter shows a clear "Checkout coming soon — payment provider not connected yet" screen. Structure it so Shopify Checkout or Razorpay drops in later.
- Empty bag state: "Nothing recovered yet." with a link to the Vault.

### 7.6 Evidence (`/evidence`)

A lookbook. A vertical scroll of large full-bleed images with mono captions (film-still feel). The section titles can use the fold or unfold transition. Each image links to its product. Use product images as placeholders until real lookbook photos exist.

### 7.7 Manifesto (`/manifesto`)

One long, slow page: the brand story in 6–8 short statements, each revealed word-by-word, with one product image interlude. End with a CTA back to the Vault.

---

## 8. Motion spec

- **Easing:** `power3.out` for reveals, `power2.inOut` for transitions, `expo.out` for the fold and unfold.
- **Durations:** micro 150–250ms, reveals 600–900ms, page transitions ≤ 700ms.
- **Page transitions:** a quick vertical "fold" wipe in `--ink` (two panels that close and open like a book) of about 600ms total. It must never delay navigation by more than 300ms.
- **Text reveals:** words rise 20px plus fade, staggered 0.04s, once per element.
- **Images:** a subtle clip-path reveal (inset from bottom) on first view.
- Respect `prefers-reduced-motion` everywhere (fades only, no pins).
- Kill and clean up all ScrollTriggers on route change.

---

## 9. Performance, SEO and accessibility

- Lighthouse mobile: **Performance ≥ 85**, Accessibility ≥ 95, SEO ≥ 95.
- LCP image is preloaded. Everything below the fold is lazy. GSAP plugins are only loaded on pages that use them.
- Semantic HTML, real `<a>` and `<button>` elements, visible focus states, alt text on every image (e.g. "Book Jacket Wrap hoodie, front view").
- Per-page metadata and Open Graph images. JSON-LD `Product` schema on product pages.
- Text contrast must pass on dark backgrounds (`--ash` only for secondary text at ≥ 14px).

---

## 10. Project structure

```
app/
  layout.tsx, page.tsx (home)
  vault/page.tsx, vault/[slug]/page.tsx
  bag/page.tsx, evidence/page.tsx, manifesto/page.tsx
components/
  layout/ (Header, Footer, MenuOverlay, PageTransition, Cursor)
  home/ (EntryGate, HeroTurnaround, ManifestoStrip, EraRow, UnfoldPanel, NextEra)
  product/ (ProductCard, Turnaround, SizeSelector, AddToBag, StickyBuyBar, SizeGuide)
  ui/ (Button, Chip, Accordion, Toast, MonoLabel)
lib/
  commerce/ (types.ts, index.ts, local-adapter.ts)
  motion/ (gsap setup, reduced-motion helpers)
  store/cart.ts
data/products.ts
scripts/split-products.ts
```

---

## 11. Build phases (stop for my review after each)

1. **Foundation:** project setup, tokens, fonts, header and footer, image split script (show me samples first), product data, commerce adapter, and cart store.
2. **Store core:** Vault grid with filters and the card turnaround, product page with the turnaround viewer, size selector, Add to Bag, sticky bar, and Bag page. *At this point the store must fully work end to end with no fancy home page.*
3. **Home:** Turnaround hero, Manifesto strip, Era rows, Unfold panel, Next Era waitlist.
4. **Polish:** entry gate, page transitions, custom cursor, Evidence and Manifesto pages, reduced-motion pass, and the performance and Lighthouse pass.

After each phase, run the dev server and check at **390px (mobile)** and **1440px (desktop)** widths. Then tell me what you built, what's placeholder, and anything you're unsure about.

## 12. When in doubt

- Clarity beats cleverness. If an effect makes it harder to understand or buy, simplify it.
- Ask me before adding any new library, changing the commerce approach, or deviating from the UX rules.
- Mark every invented value (prices, specs, units, copy) with `// PLACEHOLDER` so I can find and replace them.
