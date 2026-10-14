import type { ProductView } from "../lib/commerce/types";

export type Hotspot = {
  view: ProductView;
  /** Position on the image, in % of width / height. */
  x: number;
  y: number;
  title: string;
  text: string;
};

// Construction hotspots placed on the front views (see the product photos).
// PLACEHOLDER copy: titles and lines describe what is visible; check against the pattern notes.
export const HOTSPOTS: Record<string, Hotspot[]> = {
  "envelope-basin": [
    { view: "front", x: 33, y: 48, title: "Envelope corner", text: "Pocket corners fold inward like an envelope flap." },
    { view: "front", x: 52, y: 57, title: "Basin", text: "The folds meet in a shallow well that holds your hands." },
  ],
  "concertina-shoulders": [
    { view: "front", x: 17, y: 33, title: "Concertina", text: "Three layers step over the shoulder like a closed bellows." },
    { view: "front", x: 81, y: 37, title: "Open on reach", text: "The layers part when you lift your arms, then settle flat." },
  ],
  "folded-saddle": [
    { view: "front", x: 27, y: 33, title: "Saddle fold", text: "The shoulder panel is folded back on itself." },
    { view: "front", x: 50, y: 37, title: "Ridge", text: "A raised wave-line runs sleeve to sleeve across the chest." },
  ],
  "parchment-gusset": [
    { view: "front", x: 30, y: 51, title: "Gusset", text: "Pleated olive inserts open the side seam for room through the ribs." },
    { view: "front", x: 56, y: 27, title: "Quarter zip", text: "A short placket so the hood sits open or closed." },
  ],
  "soft-tessellation": [
    { view: "front", x: 40, y: 40, title: "Tessellation", text: "Each triangle is pin-tucked by hand into the fleece." },
    { view: "front", x: 61, y: 56, title: "Relief", text: "The tucks catch light differently at every angle." },
  ],
  "folded-apron": [
    { view: "front", x: 50, y: 39, title: "Apron seam", text: "The front panel hangs from a single seam across the chest." },
    { view: "front", x: 23, y: 51, title: "Side opening", text: "It parts at the hip onto a sand-coloured insert." },
  ],
  "stepped-shelf": [
    { view: "front", x: 36, y: 37, title: "Shelf", text: "Each tuck is folded and stitched as a small ledge." },
    { view: "front", x: 42, y: 49, title: "Step", text: "Four shelves step diagonally down the chest." },
  ],
  "pleated-hem-wings": [
    { view: "front", x: 25, y: 66, title: "Wing", text: "The hem folds out into a wing at each hip." },
    { view: "front", x: 76, y: 64, title: "Plum lining", text: "A flash of contrast shows only when the wing opens." },
  ],
  "turned-page-sleeves": [
    { view: "front", x: 16, y: 50, title: "Turned page", text: "A rust panel folds back along the sleeve like a page corner." },
    { view: "front", x: 85, y: 50, title: "Contrast cuff", text: "The rust carries through into the cuff." },
  ],
  "book-jacket-wrap": [
    { view: "front", x: 70, y: 32, title: "Overfold", text: "The left panel wraps across the chest like a dust jacket." },
    { view: "front", x: 47, y: 48, title: "Crease", text: "A pressed crease turns the wrap back toward the hip." },
    { view: "front", x: 36, y: 64, title: "Pin point", text: "The wrap anchors at the hip so it never shifts." },
  ],
  "concertina-saddle": [
    { view: "front", x: 20, y: 30, title: "Concertina yoke", text: "Ribbed pleats run across the saddle shoulder." },
    { view: "front", x: 45, y: 22, title: "Teal collar", text: "A contrast collar stops the pleats at the neck." },
  ],
  "miter-stack": [
    { view: "front", x: 29, y: 57, title: "Mitre stack", text: "Three flaps layered over the pocket, each corner mitred." },
    { view: "front", x: 71, y: 56, title: "Mirrored", text: "The stack repeats on the right, folded the other way." },
  ],
  "parallel-turn": [
    { view: "front", x: 31, y: 42, title: "Parallel pleats", text: "Pleats run in pairs and turn toward the placket." },
    { view: "front", x: 70, y: 42, title: "Chevron", text: "Both sides meet in a quiet V at the centre." },
  ],
  "pleat-exchange": [
    { view: "front", x: 37, y: 37, title: "Sewn pleat", text: "Vertical pleats are stitched shut on the chest." },
    { view: "front", x: 68, y: 62, title: "Exchange", text: "A darker panel takes over at the side seam." },
  ],
  "overfold-pavement": [
    { view: "front", x: 79, y: 46, title: "Overfold", text: "The pocket corner folds back to show its lining." },
    { view: "front", x: 63, y: 37, title: "Pocket", text: "A flat patch pocket, cut square like a paving slab." },
  ],
  "turned-leaf": [
    { view: "front", x: 30, y: 41, title: "Turned leaf", text: "A sand-faced panel turns back over the chest." },
    { view: "front", x: 67, y: 41, title: "Pair", text: "Mirrored leaves frame the placket." },
  ],
  "air-bell": [
    { view: "front", x: 40, y: 40, title: "Air pockets", text: "Bubble quilting traps a layer of air in the body." },
    { view: "front", x: 13, y: 55, title: "Balloon sleeve", text: "Volume gathers into a quilted cuff." },
    { view: "front", x: 52, y: 63, title: "Scalloped hem", text: "The quilting ends in a soft scallop." },
  ],
  "mesh-cocoon": [
    { view: "front", x: 50, y: 40, title: "Open mesh", text: "The body is cut from open mesh for air and volume." },
    { view: "front", x: 30, y: 60, title: "Frame", text: "Solid sand edging holds the cocoon shape." },
  ],
  "screen-lantern": [
    { view: "front", x: 17, y: 47, title: "Screen sleeve", text: "Mesh sleeves let light through like a lantern screen." },
    { view: "front", x: 28, y: 23, title: "Piping", text: "Black piping traces the seams like a frame." },
  ],
  "loft-ribbon": [
    { view: "front", x: 50, y: 43, title: "Ribbon seam", text: "Raised seams wrap the body on the diagonal." },
    { view: "front", x: 12, y: 50, title: "Loft", text: "Mesh sleeves add volume without weight." },
  ],
  "air-bloom": [
    { view: "front", x: 40, y: 38, title: "Perforation", text: "Ivory mesh is punched open so the jacket breathes." },
    { view: "front", x: 25, y: 46, title: "Grey panel", text: "Solid side panels give the bloom its shape." },
  ],
};
