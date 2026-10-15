# OUTLIVED: Fix List, Round 2

This list comes from a full re-review of localhost:3000 after Round 1, covering Home, the gate, Vault, a product page, Bag, Menu, Evidence, Manifesto, the info pages and the 404 page.

**Round 1 status:** fixes 1, 2, 3, 4, 6, 8, 9 and 10 are confirmed working (the gate fold now runs with no dropped frames, and the manifesto has no empty screens). Fix 5 caused a regression (Fix A below). Fix 7 works, but the image quality is too low (Fix B).

**Do not redesign anything.** Fix exactly what is listed and keep everything else identical.

## How to work (same rules as Round 1)

1. One fix at a time, in order. After each fix run `npx tsc --noEmit` and `npm run lint`, reload, and confirm the browser console is clean (no errors, warnings or hydration warnings).
2. Touch only the files the fix needs. If a shared component changes, re-check every page that uses it.
3. No new libraries. Animate only `transform`, `opacity` and `clip-path`.
4. Clean up GSAP and ScrollTrigger on unmount (`gsap.context()` + `revert()`).
5. Respect `prefers-reduced-motion`.
6. At the end, run `npm run build` (zero errors) and work through the final checklist.
7. If anything is unclear, **stop and ask**.

---

## FIX A: Visible grey rectangle around product photos (regression)

**Problem:** After the hero head fix, the product photos show a **hard-edged, lighter grey rectangle** (the photo's own backdrop) against the `--ink` page. On the home hero, this box cuts straight through the big OUTLIVED text. Vault cards (e.g. Envelope Basin) show it too.

**What to do:**

- Create one shared image treatment (e.g. a `<BlendedPhoto>` wrapper or a CSS utility class) and use it on: the home hero figure, Era cards, Vault cards, the product page turnaround viewer, and Evidence images.
- Apply a **soft feathered mask on all four edges**: `mask-image` combining a horizontal and a vertical linear gradient (`mask-composite: intersect`), fading over **~15% on the left, right and top** and **~20% at the bottom**.
- The **centre ~70% of the image stays 100% opaque**, so the figure and head are never faded. Do not reintroduce the transparent-head problem.
- Optionally, add a very subtle `--ink` radial vignette *behind* the image to help the blend.
- Layer order on the hero stays: background → OUTLIVED text → figure → dust → UI.

**Done when:** at 390px and 1440px, no rectangle or straight image edge is visible anywhere against the page. The hero head is solid, and the OUTLIVED text behind the hero is not cut by a box.

---

## FIX B: Unfold close-up is blurry and blocky

**Problem:** The Unfold image is a small crop of a ~512px panel stretched to full width, so it looks soft and blocky.

**What to do:**

- If `/public/editorial/unfold-tessellation-hires.webp` exists, use it **full-bleed**. This is a high-res replacement I'll provide.
- Otherwise (the current state):
  - Frame the existing crop at **max ~900px wide**, centred (full width on mobile is fine because the screen is small).
  - Add the site's film-grain overlay (~4%) on top to hide the compression.
- Keep the fold → flat scroll animation exactly as it is now. It works well.
- Leave a `// PLACEHOLDER: replace with hi-res macro` comment.

**Done when:** at 1440px the Unfold image no longer looks pixelated or blocky. It automatically switches to full-bleed when the hi-res file is added.

---

## FIX C: Big page titles break in the middle of a word on mobile

**Problem:** On mobile, giant titles wrap **mid-word**: "EVIDEN / CE" on /evidence and "MANIFEST / O" on /manifesto. It looks broken.

**What to do:**

- Make the giant display titles **fit their container**:
  - Use a fluid size (`clamp()` with a vw-based middle value) tuned so the **longest single word fits on one line** at 360px, 390px and 768px.
  - Use `white-space: nowrap` for single-word titles, with `overflow-wrap: normal` and `word-break: normal`, and `hyphens: none`.
- Check **every** giant title on the site at 360px, 390px and 768px: THE VAULT, EVIDENCE, MANIFESTO, BAG, the ERA titles, ERA 03 IS BEING RECOVERED, NOT RECOVERED (404), and the product names on product pages (e.g. PLEATED HEM WINGS, TURNED PAGE SLEEVES). Multi-word titles may wrap **between words only**.

**Done when:** no title on any page breaks inside a word at 360px, 390px or 768px.

---

## FIX D: Evidence page: images stay invisible, and it's showing triptych sheets

**Problems:**

1. When scrolling quickly, or landing mid-page (refresh, back button, jump), some Evidence images **never reveal**: their `clip-path` stays at `inset(100% 0 0 0)` and they never load. During review, "Exhibit 03 · Parallel Turn" stayed an empty grey box after it had been scrolled past.
2. Each "film still" is the **raw front/side/back triptych sheet**, which looks like a catalogue, not a lookbook. There is also large empty black space between exhibits.

**What to do:**

- **Reveal reliability (applies site-wide, not only Evidence):**
  - Every reveal trigger uses `once: true` and **also fires if the element is already above the viewport** (e.g. `start: "top bottom"` together with a check on mount: if `getBoundingClientRect().top < innerHeight`, reveal immediately without animating).
  - Call `ScrollTrigger.refresh()` after images load (use the `onLoad` of next/image, debounced).
  - Images must never stay hidden. Add a safety timeout: if an image's reveal hasn't fired 1.5s after it enters or passes the viewport, set it visible.
  - Images inside reveal wrappers use `loading="lazy"` **with** proper `sizes`. Make sure the clip-path wrapper doesn't stop lazy-loading from starting (the image element itself must be in layout with a real size).
- **Content:**
  - Show **one view per exhibit** (alternate front, side and back across exhibits), as a single large image with a film-still crop (e.g. 4:5 on mobile, 16:9 or 3:2 on desktop, `object-position: top center`). No triptychs.
  - Keep the caption bar (EXHIBIT 0X · NAME · CODE, VIEW ARTIFACT →) and the timecode detail.
- **Tighten spacing:** at most ~12vh of empty space between exhibits on mobile, ~16vh on desktop.
- Add `// PLACEHOLDER: replace with real lookbook photography` at the top of the Evidence data.

**Done when:**

- Jumping straight to the bottom of /evidence (e.g. pressing End, or reloading mid-page) and scrolling back up shows **every** image loaded and visible.
- No triptych sheets appear on Evidence.
- No viewport is mostly empty on /evidence.

---

## FIX E: Page transition delays navigation

**Problem:** Clicking a menu link (Home → Evidence) took **~870ms** before the URL changed. The brief allows at most ~300ms of delay. (Part of this may be dev-mode route compilation, so measure in production.)

**What to do:**

- Start the route change (`router.push`) **at the same moment** the fold-wipe panels start closing, not after they finish. Panels close over ~250ms and open once the new route has rendered.
- **Prefetch** all header, menu and footer links (Next `<Link prefetch>`), so navigation is instant in production.
- Measure with `npm run build && npm run start`: the time from click to new URL must be **under 300ms**, and the total wipe **≤ 650ms**.

**Done when:** in the production build, menu navigation feels instant and the wipe never makes the user wait.

---

## FIX F: Entry gate polish

1. When hovering the HOLD button, **fade the button's own "HOLD TO ENTER" text to 0**, so only the cursor's "HOLD" label shows (right now the two overlap and look blurry). Restore it on mouse leave and when the hold is released.
2. **Cap erosion at 50%** of characters. The line must always stay recognisable, even after 10+ seconds on the gate.

**Done when:** hovering the button shows one clean "HOLD" label. After 15 seconds on the gate, "MOST THINGS DON'T LAST." is still recognisable.

---

## Final checklist (before telling me you're done)

1. `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass with zero errors.
2. Console clean on Home, Vault, a product page, Bag, Evidence, Manifesto, an info page and the 404 page.
3. At **360px, 390px and 1440px**:
   - no image rectangle is visible anywhere
   - no title breaks mid-word
   - no empty screens on Evidence
4. Jump-to-bottom test on Home, Vault and Evidence: every image is visible after scrolling back up.
5. Waitlist form:
   - an invalid number (e.g. 12345) shows a clear error
   - a valid 10-digit number shows a success state
   - submitting twice doesn't duplicate or break anything
6. Production build (`npm run start`): menu navigation is under 300ms to the new URL.
7. Send me screenshots at 390px and 1440px of: the home hero, a Vault card, Unfold, the Evidence page (top and one exhibit) and the Manifesto title.
8. List anything you could not fix, and why.
