# OUTLIVED — Creative Direction v2 (overrides the "safe" parts of OUTLIVED_BUILD_PROMPT.md)

Read this fully before writing code. `OUTLIVED_BUILD_PROMPT.md` still defines the brand, tokens, product data, pages, commerce adapter and UX rules. **This file raises the ambition.** Where the two conflict on visuals or motion, this file wins. Where they conflict on usability (the UX rules), the UX rules win.

## The bar

The current build looks like a template. That is a failure. The target is **Awwwards Site-of-the-Day level**, in the league of:

- **oryzo.ai**: one object treated like a monument, with depth and inertia
- **cartier.com/en-fr/watchesandwonders**: each product in its own lit space
- **hubtown.co.in**: dark, glowing, cursor-reveal
- **matvoyce.tv**: kinetic typography
- **shopify.com/editions/spring2026**: particle type and cinematic section choreography

OUTLIVED sells to the top 1%. People who visit should feel they've walked into a private archive that no other Indian brand could have built. Every screen should make someone want to screenshot it. **But nobody should ever be confused about what we sell, what it costs, or where to click.**

## Tech additions (approved)

- **Three.js via React Three Fiber + drei** for WebGL moments, plus custom GLSL shaders.
- **GSAP (ScrollTrigger, SplitText or a custom split, Flip)** and **Lenis**.
- WebGL canvases are lazy-loaded, paused when off-screen, and DPR-capped at 1.75.
- Every WebGL moment has a **static or CSS fallback** for low-end devices and `prefers-reduced-motion`.
- Detect a weak GPU or battery-saver and fall back automatically.

## Signature moments (build all of these)

### 1. Entry ritual (first visit only, skippable)

- Black screen with the line "MOST THINGS DON'T LAST." in mono.
- The letters slowly **erode**: a scramble/decay effect where characters flicker into glyph noise and some vanish.
- Under it sits a "HOLD TO ENTER" ring that fills in rust over 1.2s. Hold progress also slows the erosion, as if you are preserving it.
- On release-complete, the screen **folds like origami**: 4 triangular panels fold back in 3D (CSS 3D with expo.out, 900ms) to reveal the hero.
- A "Skip" link is always visible. Returning visitors skip it automatically.

### 2. Hero: "The Monument" (WebGL)

- The faceless figure in Book Jacket Wrap stands in a **cone of light**, with fine dust particles drifting through the beam (instanced points, additive blend, very subtle).
- The product image sits on a **WebGL plane with a fold shader**. On load, the image starts **creased**, with diagonal fold lines displaced in the vertex shader and shading along the creases. It **unfolds flat** over ~1.4s, so the garment literally unfolds.
- On scroll (pinned ~120vh desktop, ~70vh mobile), it turns **front → side → back** using a **noise-displacement dissolve** between textures, not a plain crossfade.
- `OUTLIVED` is set enormous behind the figure. The figure sits in front of the type, so it's partly occluded (layered depth).
- Mouse parallax: light cone, dust and type shift at different depths (max 12px).
- First paint shows: the figure, the product name in mono (`OTL-D07-35 · BOOK JACKET WRAP · ₹7,499`), and an **"Enter the Vault →"** button. No waiting to understand what this is.

### 3. Manifesto: kinetic type

- Three statements, each a full screen:
  - "TRENDS DIE IN A SEASON."
  - "WE MAKE WHAT'S LEFT BEHIND."
  - "*Built to outlive.*"
- Letters reveal by line with a mask. Scroll **velocity** stretches the letters vertically (scaleY up to 1.15, springs back), in the Mat Voyce style.
- The last line switches to Instrument Serif italic in rust.

### 4. Era chapters: the archive turning its pages

- Each Era opens with a chapter card ("ERA 01 — THE FOLD", plus a one-line description and a piece count) that **unfolds** from a creased state as it enters.
- Then a **pinned "page stack"**: 4 featured products stacked like pages. As you scroll, each page **turns** (rotateY around its left edge, with a shadow sweep) to reveal the next. A small progress indicator (`02 / 04`) and a visible "View all 16 →" are shown at all times.
- Each page shows a big image, name, code, price and an "Add to Bag" quick action.
- Mobile: no pin. Use a swipeable horizontal snap carousel with the same page-turn on swipe.

### 5. Product hover (everywhere)

- WebGL hover on product images: a subtle **liquid displacement** that follows the cursor, plus a slight RGB split at the edges, ≤ 300ms ease.
- Moving across the card scrubs **front → side → back**.
- Custom cursor: a bone dot that becomes a ring labelled `VIEW` (or `DRAG` on turnaround viewers). Desktop only.

### 6. The Unfold

A full-width macro image (pleat close-up or a lifestyle shot). It starts folded into 5 horizontal strips with alternating rotateX and shading, then unfolds flat on scroll, scrubbed. Caption: "Every OUTLIVED piece begins as a flat sheet. The folds are the design."

### 7. Vault (shop)

- Masonry-like editorial grid with deliberate scale changes (some cards 2× size), not a uniform template grid.
- Images reveal with clip-path. The grid gets a slight skew on fast scroll (velocity-based, ±2°).
- Filter chips (All / Era 01 / Era 02, plus type) re-sort cards with **GSAP Flip**.
- The counter `UNIT 047 / 150` is shown in rust on every card.
- Clicking a card does a **shared-element transition**: the image flies and scales into the product page hero.

### 8. Product page: "The Exhibit"

- A large turnaround viewer with drag and **inertia**, snapping to front, side or back. A one-time hint reads "← drag to turn →".
- **Construction hotspots**: 2–3 pulsing rust dots placed on the garment's folds. Hover or tap shows a small placard ("Overfold — left panel wraps like a dust jacket"). *This is the 1% detail. It explains why the piece costs what it costs.*
- **Fabric loupe**: on desktop hover, a circular magnifier at 2.5× follows the cursor over the image.
- The info column stays calm (3/10 motion): name, code, price, unit counter, sizes, a rust Add to Bag, construction note, and accordions.
- Mobile shows a sticky buy bar.

### 9. Page transitions

A **fold wipe**: two `--ink` panels hinge closed from the top and bottom like a book (~300ms), the route changes, then they open. Total ≤ 650ms. Never block the click.

### 10. Footer

`OUTLIVED` set enormous at the bottom. Each letter **reacts to the cursor**, lifting and tilting slightly toward it like loose pages. On mobile, the letters respond to scroll instead.

### 11. Ambient sound (optional, OFF by default)

A small `SOUND OFF/ON` toggle in the header. When on, a low ambient drone plays, plus a soft paper-fold sound on page turns and transitions. Never autoplay.

## Banned (this is what makes sites look cheap or templated)

- Centered hero with only a headline and a button
- Uniform card grids with rounded corners and drop shadows
- Default Tailwind look, generic icons, emoji
- Sale badges, % OFF, pop-ups, fake urgency timers
- Animations that delay content or hijack the main scroll direction
- Anything that hides the price or the Add to Bag on product pages

## Quality loop (mandatory, do not skip)

After each signature moment:

1. Run the site and **record a short Playwright video** scrolling through that section at 1440px and at 390px. Take screenshots at 3 scroll positions.
2. Review them yourself against the reference sites listed above. Ask: *Would this win Site of the Day? Is it obvious what we sell and where to click? Does it look like any template?*
3. If it looks flat, generic, janky (below 55fps), or confusing, **iterate before moving on**. Note what you changed.
4. Check the console is clean and Lighthouse mobile Performance is ≥ 75 (WebGL pages) or ≥ 85 (others).

At the end, give me:

- Screenshots and short videos of Home (each moment), Vault, one Product page, and Bag.
- A list of every placeholder.
- Anything you'd still improve.

## Order of work

1. Fix existing errors. Split the images from `/raw-products` (show me 2 samples first). Remove the Phase-1 catalogue table from home.
2. Vault and Product page (moments 5, 7, 8) so the store works with real images.
3. Home: moments 2, 3, 4, 6, 10.
4. Entry ritual (1), page transitions (9), sound (11).
5. Full quality loop, fallbacks, mobile pass, performance.

Assumptions for now: selling in India first (INR, Razorpay later), and `OUTLIVED` stays as a styled text wordmark until a logo file exists.
