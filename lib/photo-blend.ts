/**
 * Shared photo treatment (see .photo-blend in app/globals.css): the photo sits
 * inset inside a backdrop-coloured frame that feathers on all four edges.
 */

/** Photo box inside the frame, as fractions of the frame. */
export const PHOTO_INSET = { top: 0.12, left: 0.09, right: 0.09, bottom: 0.06 };

/** Frame feather widths, as fractions of the frame. */
export const FEATHER = { side: 0.15, top: 0.15, bottom: 0.2 };

/**
 * For an element that should exactly cover a frame around a known photo box:
 * negative offsets (as % of the photo box) to place the frame outside it.
 */
export const FRAME_AROUND_PHOTO = (() => {
  const h = 1 - PHOTO_INSET.top - PHOTO_INSET.bottom;
  const w = 1 - PHOTO_INSET.left - PHOTO_INSET.right;
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  return {
    top: pct(-PHOTO_INSET.top / h),
    bottom: pct(-PHOTO_INSET.bottom / h),
    left: pct(-PHOTO_INSET.left / w),
    right: pct(-PHOTO_INSET.right / w),
  };
})();
