# OUTLIVED — Fixes Round 3 (QA pass before database + auth)

Full Playwright pass on localhost:3000 at 360 / 390 / 1440 / 1920px, dev server and
production build (`npm run build && npm run start`). Findings first, then what was
checked and came back clean. All findings below are fixed (see "Status").

QA scripts (all in `scripts/qa/`):
`round3-routes.mjs` (routes × widths: status, console, overflow, clipped controls,
images after fast scroll + jump; `REDUCED=1` for reduced motion),
`round3-interactions.mjs` (cart, menu, keyboard focus, product viewer, size guide),
`fold-timing.mjs` (above-the-fold visibility on direct load; `FRESH=1` first visit,
`SLOWJS=4000` holds JS back 4s), plus the existing `gate-*`, `bag-flow`,
`waitlist-test`, `title-check`, `lighthouse`.

---

## Findings

### 1. Direct load of a deep link shows a blank page until JavaScript runs (the "image after ~5s" bug)

- **Problem:** On a first visit in a new tab, the inline head script set
  `html[data-gate="pending"]` on *every* route, not just the homepage. That covers the
  page in `--ink` until the EntryGate component hydrates. In dev (on-demand compile) or
  on a slow phone, hydration takes seconds, so a product page whose image had loaded at
  ~0.37s stayed blank for ~5s. Headless QA never saw it: the gate script skips user
  agents containing "headless", so earlier timing runs measured a page with no gate.
- **Where:** `app/layout.tsx` (`GATE_SCRIPT`), `components/layout/EntryGate.tsx`.
- **Fix:** Gate only on the homepage (`location.pathname === "/"`, or `?gate=1`).
  Deep links (a product shared on WhatsApp, `/evidence`, `/vault`, `/manifesto`) open
  straight onto their content. A reload or a page change in the same tab still skips
  the gate, as before. `fold-timing.mjs` now uses a real Chrome UA and treats an
  up/pending gate as "not visible", so this can't hide again.

### 2. Above-the-fold images on /vault and /evidence wait for hydration

- **Problem:** `.reveal-clip` hides with `clip-path: inset(100% 0 0 0)` as soon as
  `html.js` is set (first paint), and only RevealObserver (client JS) reveals it. With JS
  held back 4s, the first Vault card and the first Evidence still appeared at ~4.3s
  (dev: 1.1–1.3s on a warm server).
- **Where:** `app/globals.css` (`.reveal-clip`), `components/layout/RevealObserver.tsx`.
- **Fix:** Until RevealObserver mounts, every reveal plays by itself on a CSS timer
  (`html.js:not(.reveal-armed) .reveal-clip { animation: reveal-auto 700ms … 100ms }`,
  opacity variant under reduced motion). On mount, RevealObserver reveals what is in
  view and adds `html.reveal-armed`; below-the-fold elements (unseen) go back to hidden
  and reveal on scroll as before. Normal loads (hydration < 100ms) are unchanged.

### 3. Product viewer: one drag / swipe skips a view (front → back)

- **Problem:** On release, the target was clamped to ±1 view around the *current rounded*
  position. A drag past halfway already rounds to the next view, so the fling added
  another: front jumped straight to back, back to side.
- **Where:** `components/product/Turnaround.tsx` (`onPointerUp`).
- **Fix:** Clamp to ±1 around the view the drag *started* from (`Math.round(d.v)`).
  Drag (1440) and touch swipe (390) now go front → side → back.

### 4. Product viewer: hotspots can't be opened by tap, and click closes them on desktop

- **Problem:** Hotspots opened on `mouseenter` / `focus` and toggled on `click`. A mouse
  click arrives after `mouseenter` (already open), so it closed the tooltip. A tap on a
  phone fires `focus` (open) then `click` (close), so a hotspot could never be opened on
  touch.
- **Where:** `components/product/Turnaround.tsx` (hotspot buttons).
- **Fix:** Open state is `{ i, pinned }`. Hover and focus open it loosely; a click or tap
  pins it open; a second click unpins and closes; leaving with the mouse only closes an
  unpinned one; blur (tap elsewhere) closes it.

### 5. Home: Lighthouse mobile Performance 41 (TBT 1,980ms)

- **Problem:** The hero's WebGL scene mounts on the first interaction **or a 3.5s idle
  timer**. On a phone with no interaction, the timer pulled in the ~900 KB three.js chunk
  inside the load window: 2.3s of script evaluation plus 1.3s and 0.9s long tasks.
- **Where:** `components/home/HeroMonument.tsx`.
- **Fix:** Touch devices (no fine pointer) skip the idle timer and mount WebGL on the
  first touch / scroll / key. A visit that bounces never downloads the 3D. The CSS
  crossfade hero covers until then; desktop keeps the idle mount; a first visit still
  mounts behind the entry gate. Home: 41 → 89.

### 6. Console warning: unused image preload on /vault (desktop)

- **Problem:** "…front-cut.webp&w=640 was preloaded using link preload but not used…" on
  a full load of `/vault` at 1440/1920 after visiting `/` (the Era section had already
  cached the same image). The preload came from `next/image` `priority` on the first two
  cards, and React 19 also adds one for any `<img fetchPriority="high">` and any eager
  `<img>` without `fetchPriority="low"`.
- **Where:** `components/product/ProductCard.tsx`.
- **Fix:** First card: `loading="eager"` + `fetchPriority="low"` (no preload link). The
  `<img>` is in the server HTML, so the preload scanner finds it at once, and Chrome
  raises in-viewport images to high priority after layout. Vault Performance stays 80–87.

### 7. Console warning + wasted download on the main shopping path (Vault card → product)

- **Problem:** The product viewer's front image used `next/image` `priority`, which preloads
  the srcset candidate for its `sizes` (e.g. `w=640`). Arriving from a Vault card (or after
  the homepage), the browser already holds a larger copy (`w=750`) and picks that from the
  srcset, so the preloaded 640 is downloaded for nothing and Chrome warns "preloaded but not
  used". Happened on client-side navigation too, i.e. on the normal click-a-card path.
- **Where:** `components/product/Turnaround.tsx` (front layer `<Image>`).
- **Fix:** Same as #6: `loading="eager"` + `fetchPriority="low"` on the front view, no
  preload. Product Lighthouse Performance unchanged (86). `round3-interactions.mjs` now walks
  home → Vault → card → product → back three times and fails on any console warning.

---

## Checked and clean

1. **Routes + console:** `/`, `/vault`, all 21 live `/vault/[slug]`, `/bag`, `/evidence`,
   `/manifesto`, `/info/{size-guide,shipping-returns,contact,privacy,terms}`, 404, at all
   four widths, dev and production: 0 errors, 0 warnings, 0 page errors. The 404 page
   logs only its own 404 document status. `capillary-flow` and `mercury-tide` (Era 03
   teasers, `status !== "live"`) return 404 by design and nothing links to them.
2. **Layout:** no horizontal overflow at any width; no cut-off button, link or input text
   (the skip link is screen-reader-only by design); no title breaking mid-word
   (`title-check`, 4 widths × 11 pages).
3. **Gate:** `?gate=1` shows; custom cursor + "HOLD" ring on hover; hold completes and
   the fold runs at 58fps average under 4× CPU throttle (worst frame 50ms); reload skips;
   Space and Enter hold work; touch hold works in mobile emulation; long-press doesn't
   select text.
4. **Cart:** add without size shows the error; add with size; header count updates
   ("Bag, 1 item"); qty + / −; remove; persists after reload; empty state after remove
   and after reload; header back to "Bag, 0 items".
5. **Waitlist:** invalid number shows the error with `aria-invalid`; valid 10-digit shows
   success; double submit stores one entry.
6. **Images:** after a fast scroll + jump to the bottom and back, every image on every
   route at every width is loaded and visible (no stuck reveals).
7. **Menu:** opens with focus inside, Escape closes and returns focus to the Menu button,
   every link navigates and closes it; keyboard Tab shows a visible focus ring on every
   stop.
8. **Size guide:** opens; closes with its button and with Escape.
9. **Lighthouse** (mobile, production, image-optimizer cache warm):

   | Page | Performance | Accessibility | Best practices | SEO |
   |---|---|---|---|---|
   | `/` | 85 | 100 | 100 | 100 |
   | `/vault` | 83 | 100 | 100 | 100 |
   | `/vault/book-jacket-wrap` | 86 | 100 | 100 | 100 |

   Run-to-run spread is a few points (`/` scored 85–89 across the last three runs).

   First run after a server restart scores lower (e.g. `/` 72): `/_next/image` encodes
   each size on first request (~670ms for the hero), which Lighthouse's simulation scales
   up. A CDN or warm cache removes it.
10. **Reduced motion:** every page works, no ScrollTrigger pins, all text and images visible.

**Above-the-fold on direct load** (budget 600ms), production, `fold-timing.mjs`:
returning visitor 41–224ms; first visit 43–209ms; JS held back 4s 36–318ms
(product pages, `/evidence`, `/manifesto`, `/vault`, 390 and 1440).

## Status

All seven findings fixed. `npx tsc --noEmit` clean, `npx eslint` clean, `npm run build` passes.
