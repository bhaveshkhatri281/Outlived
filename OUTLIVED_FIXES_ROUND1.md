# OUTLIVED: Fix List, Round 1

These fixes come from a hands-on review of the running site at localhost:3000, on a phone-width layout (~390–760px) and on desktop (1366px). The site is in good shape. **Do not redesign anything.** Fix exactly what's listed, keep everything else identical, and avoid regressions.

Read this whole file before touching code.

---

## How to work (important, this is how we avoid new errors)

1. **One fix at a time, in the order below.** After each fix:
   - Run `npx tsc --noEmit` (no type errors) and `npm run lint` (no lint errors).
   - Reload the page and check the browser console. **It must stay clean** (no errors, no React warnings, no hydration warnings).
   - Check the "Done when" criteria for that fix, at both 390px and 1440px.
2. **Do not change unrelated files.** If a fix needs a shared component (e.g. the cursor), change only what's needed and re-check every page that uses it.
3. **No new libraries** unless a fix explicitly says so. GSAP, Lenis, R3F/drei and Zustand are already in the project, so use them.
4. **Animate only `transform` and `opacity`** (plus `clip-path` where already used). Never animate `width`, `height`, `top`, `left`, `margin` or `filter: blur` on large elements. These cause the stutter we're fixing.
5. **Every `localStorage` / `sessionStorage` read and write is wrapped in try/catch** and the site works if storage is blocked.
6. **Clean up every GSAP animation and ScrollTrigger** when a component unmounts (`gsap.context()` + `ctx.revert()` in the effect cleanup). No duplicate triggers after navigating back and forth.
7. **Respect `prefers-reduced-motion`** for anything you touch: fades only, no pins, no erosion.
8. At the very end, run `npm run build` and confirm it completes with **zero errors**, then do the final checklist at the bottom.

If anything in this file is unclear or conflicts with existing code, **stop and ask me**. Don't guess.

---

## FIX 1: Entry gate: show once per visit, not once ever

**Problem:** The gate is remembered permanently (localStorage), so it shows once per browser and never again, even on a new visit days later.

**What to do:**

- Switch the "has entered" flag from `localStorage` to **`sessionStorage`** (key: `outlived:entered`).
- Behaviour:
  - New tab or new visit: gate shows.
  - Reload or moving between pages in the same tab session: no gate.
- Add a test override: if the URL has `?gate=1`, always show the gate (ignore storage).
- Keep the **Skip** link visible at all times. Skip sets the same session flag.
- The gate renders **client-side only** (no flash of the gate for crawlers, no hydration mismatch). Until we know whether to show it, render a plain `--ink` cover for at most one frame, never the homepage flashing first and then the gate on top.

**Done when:**

- Opening localhost:3000 in a new tab shows the gate.
- Reloading does not show it.
- Closing the tab and opening a new one shows it again.
- `localhost:3000/?gate=1` always shows it.
- No hydration warning in the console.

---

## FIX 2: Entry gate: missing cursor

**Problem:** On the gate, there is **no cursor at all**. The site hides the system cursor for the custom cursor, but the gate overlay sits above the custom cursor. Users have to guess where the button is.

**What to do:**

- Give the custom cursor a **higher z-index than the gate overlay** (e.g. the gate is `z-[100]` and the cursor `z-[200]`), and make sure the cursor is mounted before or with the gate.
- **Fallback rule:** the system cursor is hidden (`cursor: none`) **only after** the custom cursor has mounted and received its first mouse position. If the custom cursor fails or hasn't mounted, the normal cursor stays visible. The user must never have no cursor.
- Hovering **HOLD TO ENTER**:
  - The cursor dot grows into a ring with the label **"HOLD"** (mono, small, uppercase).
  - The button gets a visible hover state: its border brightens from `--line` to `--bone`, with a slight `scale(1.04)` over 200ms.
- While holding, the rust progress fill shows on the **button ring** and is mirrored on the **cursor ring**.
- Touch devices: no custom cursor (as before), normal behaviour.

**Done when:** at 1440px, moving the mouse on the gate always shows a cursor. Hovering the button shows the "HOLD" ring and the button's hover state.

---

## FIX 3: Entry gate: hold behaviour and readability

**Problem:** The line "MOST THINGS DON'T LAST." erodes so fast that within ~2 seconds it reads like "O T I N: /.". First-time visitors never get to read it.

**What to do:**

- **Timing:**
  - The line types or fades in fully over 0.6s.
  - It stays **fully readable and still for 2.5s**.
  - Then erosion starts slowly, spread over **~4s**.
  - Erosion never removes more than ~60% of the characters, so the line stays recognisable.
- **Holding slows erosion** (as per the creative direction) and holding to completion takes **1.2s**.
- **Early release:** the fill **drains back smoothly** over ~400ms (no instant snap to 0), and a small hint fades in under the button: "Keep holding".
- **Keyboard:** holding **Space** or **Enter** while the button is focused works exactly like holding the mouse. The button is focusable and has a visible focus ring.
- **Mobile touch:** press-and-hold works.
  - Disable text selection on the gate (`user-select: none`), the iOS callout (`-webkit-touch-callout: none`) and the context menu on the button (`onContextMenu={e => e.preventDefault()}`).
  - Use `touch-action: none` on the button only.
  - Use **pointer events** (`pointerdown` / `pointerup` / `pointercancel` / `pointerleave`) so mouse and touch share one code path. Call `setPointerCapture` on `pointerdown`.

**Done when:** a first-time visitor can comfortably read the full line for at least 2.5s. Releasing early drains the ring smoothly. Space and Enter work. On a phone, long-press does not select text or open a menu.

---

## FIX 4: Entry gate: fold-away animation stutters at the end

**Problem:** When the hold completes, the origami / envelope fold-open is smooth at the start but **hangs or stutters near the end**, as if it gets stuck for a moment before the homepage takes over.

**Likely causes (check all of them):**

1. **Long easing tail.** `expo.out` spends its last ~25% barely moving, which reads as "stuck".
2. **Heavy work at the same moment.** When the gate finishes, the code probably (a) unmounts the gate (React re-render), (b) starts Lenis, (c) calls `ScrollTrigger.refresh()`, and (d) initialises the WebGL hero (shader compile + texture upload). All in the same frame, so the main thread blocks and the animation freezes on its last frames.
3. **Animating non-compositor properties** (anything other than transform/opacity), or panels without their own GPU layer.

**What to do:**

- **Easing:** use `power3.inOut` for the panel fold (or a custom ease that finishes decisively). **Duration 0.9s total.** In the **last 20%** of the timeline, also fade the panels' `opacity` to 0, so the motion ends cleanly instead of crawling.
- **Prepare the hero during the gate, not after it:**
  - While the gate is on screen, preload the hero textures (front, side and back images) and **pre-compile the WebGL scene** (`gl.compile(scene, camera)` in R3F, or render one frame off-screen).
  - The hero canvas mounts **behind** the gate from the start (hidden under it), so nothing initialises at the moment the gate opens.
- **Defer the heavy calls** until the fold animation is fully complete:
  - On the GSAP timeline's `onComplete`, wait **two animation frames** (`requestAnimationFrame` inside `requestAnimationFrame`).
  - Then, in this order: start Lenis, call `ScrollTrigger.refresh()`, and only then unmount the gate (or set it to `display:none` / `visibility:hidden`).
  - Never unmount the gate mid-animation.
- **GPU layers:** each fold panel gets `will-change: transform, opacity` **only while animating** (set before, remove after), plus `backface-visibility: hidden` and `transform-style: preserve-3d` on the parent. Use `force3D: true` in GSAP.
- **No layout reads during the animation** (no `getBoundingClientRect` or `offsetHeight` inside the tween callbacks).
- **Body scroll** stays locked during the gate (`overflow: hidden` on html), and is released in the same deferred step as Lenis start, not earlier.

**Done when:** in Chrome DevTools > Performance, recording the gate opening shows **no long task (>50ms) during the 0.9s fold**, and the animation looks continuous to the eye from start to finish, at 1440px and with 4× CPU throttling. No visible pause between the fold ending and the homepage being scrollable.

---

## FIX 5: Hero: head looks faded or see-through

**Problem:** The light cone / vignette mask fades the **top of the figure**. The balaclava looks semi-transparent and the big OUTLIVED text shows through the head.

**What to do:**

- The **figure image stays 100% opaque everywhere.** The vignette applies only to the **background and the frame edges**, never on top of the figure.
- Layer order (back to front): background / light cone → big OUTLIVED text → figure (fully opaque) → dust particles (subtle, can pass in front) → UI text and buttons.
- If the figure image has a dark backdrop baked in, use a soft radial mask only on the **outer edges** of the image rectangle, so the backdrop melts into the page while the figure itself (centre ~70%) is untouched.

**Done when:** at 390px and 1440px, the head and shoulders are fully solid with no text visible through them, and the image edges still blend smoothly into black.

---

## FIX 6: Manifesto: empty screens on mobile

**Problem:** On mobile, the manifesto section has long stretches of pure black. At one scroll position the **entire screen was empty**, which reads as broken.

**What to do:**

- Reduce the pinned scroll distance for the manifesto on screens under 768px to **about half** of the current value.
- Overlap the lines: the next statement starts entering as the previous one settles.
- **No viewport, at any scroll position, may be fully empty.** At least one statement (or part of one) is always visible.
- Keep the velocity stretch effect on desktop. On mobile, cap the stretch at `scaleY 1.08`.

**Done when:** scrolling slowly through the manifesto at 390px, every screen shows text, and the whole section takes noticeably less scrolling than now.

---

## FIX 7: The Unfold panel: uses the raw triptych sheet

**Problem:** The Unfold section shows the **raw product sheet** (front, side and back side by side, with tiny FRONT/SIDE/BACK labels). It looks like a catalogue page, not a hero moment, and the fold → flat animation isn't clearly visible.

**What to do:**

- Create a **dedicated close-up crop**:
  - Take Soft Tessellation's **front** image (`/public/products/soft-tessellation/front`) and crop tightly on the chest, where the diamond-fold pattern is.
  - Export as `/public/editorial/unfold-tessellation.{avif,webp}`, **at least 2000px wide**, with the labels and backdrop edges excluded.
  - Add this crop to the image script so it's reproducible.
- Show the crop **full-width**.
- The fold → flat effect must be **obvious**:
  - It starts as 5 horizontal strips with alternating `rotateX` (±60°) and darker shading on the inward strips.
  - It unfolds to flat **scrubbed by scroll** across ~80vh of scrolling.
  - On mobile, the same effect over ~60vh.
- Caption stays: "Every OUTLIVED piece begins as a flat sheet. *The folds are the design.*"

**Done when:** the Unfold section shows a single dramatic close-up of folds (no triptych, no labels), and you can clearly see it go from creased strips to flat while scrolling, at 390px and 1440px.

---

## FIX 8: Vault on mobile: too slow to browse, Jacket filter cut off

**Problems:**

1. On mobile, each product card's image is **taller than the screen**. The name and price sit below it, so you see about one product per 1.5 scrolls.
2. The filter chip row is cut off on the right; **"Jacket" isn't visible** and there's no hint that the row scrolls.

**What to do:**

- **Cards under 768px:**
  - Max height **~70vh**, image `object-fit: cover` with `object-position: top center` (heads never cut off).
  - **Overlay** the name, code, price and unit counter at the bottom of the image, on a gradient (transparent → `--ink` at ~85% opacity) so the text is always readable.
  - The swipe through front → side → back and the dots stay.
- **Filter chips:**
  - Make the row **horizontally scrollable** (`overflow-x: auto`, hidden scrollbar, `scroll-snap-type: x proximity`).
  - Add a **fade on the right edge** (gradient mask) while more chips are hidden off-screen, and on the left edge once scrolled.
  - Chips never wrap or shrink their text.
  - The row stays sticky under the header as it does now.
- Desktop Vault layout stays exactly as it is (it's good).

**Done when:** at 390px, you can see a product's image, name and price **within one screen**, roughly 1.5 products are visible per screen height, and the Jacket chip is reachable with an obvious scroll hint.

---

## FIX 9: Homepage Era cards on mobile: heads cropped, small peek

**Problem:** In the Era 01 and Era 02 swipeable "page stack" on mobile, the card images crop the **top of the head**, and the next card only peeks a sliver at the edge.

**What to do:**

- Card images: `object-position: top center` so heads are never cut.
- Card width on mobile **~85%** of the viewport, so **~15%** of the next card is visible as a swipe hint.
- Keep the page-turn feel on swipe, plus the `01 / 04` indicator and "View all" link.

**Done when:** at 390px, no product head is cropped in the Era rows, and the next card is clearly visible at the right edge.

---

## FIX 10: Performance check on mobile

**Problem:** During review, one scroll on the homepage briefly froze the browser. This might be heavy WebGL work (dust particles, shaders, high pixel ratio).

**What to do:**

- Profile the homepage in Chrome DevTools with **4× CPU throttling** and a **mobile viewport (390px)**.
- If scrolling drops below ~50fps or there are long tasks (>50ms) during scroll:
  - On mobile, **halve the dust particle count** and cap the device pixel ratio at **1.25**.
  - **Pause the WebGL render loop** when the hero is off-screen (`frameloop="demand"` or an IntersectionObserver), so it isn't rendering while you scroll through the rest of the page.
  - Lazy-load the Unfold and Era images (`loading="lazy"`, proper `sizes`).
- Make sure only **one** `requestAnimationFrame` loop drives Lenis and GSAP: use `gsap.ticker` to drive Lenis, and don't run a separate rAF loop.

**Done when:** scrolling the whole homepage at 390px with 4× CPU throttling feels smooth, with no freezes, and the Performance panel shows no long tasks during scroll.

---

## Final checklist (do all of this before telling me you're done)

1. `npx tsc --noEmit`: no errors.
2. `npm run lint`: no errors.
3. `npm run build`: completes with no errors.
4. Browser console on Home, Vault, one product page and Bag: **zero errors and zero warnings**.
5. Gate test:
   - New tab: gate shows with a visible cursor.
   - Hold to enter: smooth fold, no stall at the end.
   - Reload: no gate.
   - `?gate=1`: gate shows.
6. Full scroll of the homepage at 390px and 1440px: no empty screens, no stutter.
7. Add a product to the bag from a product page, open the Bag, and change the quantity. Everything works.
8. Send me **screenshots at 390px and 1440px** of:
   - the gate (with cursor visible on desktop)
   - the home hero
   - the manifesto
   - the Unfold panel
   - the Vault
   - one product page
9. List anything you could not fix, and why.
