import type { Category, Size } from "../lib/commerce/types";

// PLACEHOLDER: garment measurements in cm, laid flat. Replace with real grading.
export const SIZE_GUIDE: Record<Category, { size: Size; chest: number; length: number; sleeve: number }[]> = {
  Hoodie: [
    { size: "S", chest: 60, length: 68, sleeve: 58 },
    { size: "M", chest: 63, length: 70, sleeve: 59 },
    { size: "L", chest: 66, length: 72, sleeve: 60 },
    { size: "XL", chest: 69, length: 74, sleeve: 61 },
    { size: "XXL", chest: 72, length: 76, sleeve: 62 },
  ],
  Shacket: [
    { size: "S", chest: 62, length: 72, sleeve: 60 },
    { size: "M", chest: 65, length: 74, sleeve: 61 },
    { size: "L", chest: 68, length: 76, sleeve: 62 },
    { size: "XL", chest: 71, length: 78, sleeve: 63 },
    { size: "XXL", chest: 74, length: 80, sleeve: 64 },
  ],
  Jacket: [
    { size: "S", chest: 66, length: 62, sleeve: 59 },
    { size: "M", chest: 69, length: 64, sleeve: 60 },
    { size: "L", chest: 72, length: 66, sleeve: 61 },
    { size: "XL", chest: 75, length: 68, sleeve: 62 },
    { size: "XXL", chest: 78, length: 70, sleeve: 63 },
  ],
};
