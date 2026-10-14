const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** 7499 → "₹7,499" */
export function formatINR(amount: number) {
  return inr.format(amount);
}

/** (47, 150) → "UNIT 047 / 150" */
export function formatUnits(left: number, total: number) {
  const width = String(total).length;
  return `UNIT ${String(left).padStart(width, "0")} / ${total}`;
}

/** "Era 01 · The Fold" style helpers */
export function eraLabel(id: string) {
  return `ERA ${id}`;
}

/**
 * Accepts "98765 43210", "+91 98765-43210", "098765 43210" and returns the
 * 10-digit mobile number, or null if it isn't a valid Indian mobile.
 */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}
