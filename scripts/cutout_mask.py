"""
Segmentation step for scripts/cutout-products.ts (run through it, not directly).

    python scripts/cutout_mask.py <out_dir> <src.webp>...

Writes <out_dir>/<n>.png (RGBA: original pixels + alpha) for the n-th source.

Model: rembg BiRefNet (general, lite). Tested against @imgly/background-removal
(medium), IS-Net and U2-Net human-seg on these photos: it is the only one that
keeps dark denim solid on back and side views (jeans and backdrop are close in
tone) while keeping mesh and the black balaclava solid and the edges crisp.

Some views were cropped through a sleeve when the triptychs were split, so the
figure touches the side of the frame. The alpha ramps to 0 over the outer 4% of
each side (and 1.5% at the top) so a cut sleeve melts away instead of ending on
a hard vertical line. The bottom (cut-off jeans) is faded on the site in CSS.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

SIDE_RAMP = 0.04
TOP_RAMP = 0.015


def cut(session, src: Path) -> Image.Image:
    im = Image.open(src).convert("RGB")
    alpha = np.asarray(remove(im, session=session, only_mask=True), np.float32) / 255
    h, w = alpha.shape
    x = (np.arange(w) + 0.5) / w
    y = (np.arange(h) + 0.5) / h
    ramp_x = np.clip(np.minimum(x, 1 - x) / SIDE_RAMP, 0, 1)
    ramp_y = np.clip(y / TOP_RAMP, 0, 1)
    alpha *= ramp_y[:, None] * ramp_x[None, :]
    rgba = np.dstack([np.asarray(im), (alpha * 255).round().astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    session = new_session("birefnet-general-lite")
    for i, src in enumerate(sys.argv[2:]):
        cut(session, Path(src)).save(out / f"{i}.png")
        print(i, flush=True)


if __name__ == "__main__":
    main()
