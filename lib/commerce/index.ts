import { localAdapter } from "./local-adapter";
import type { CommerceAdapter } from "./types";

/**
 * The one commerce entry point for UI code. To switch provider, implement
 * `CommerceAdapter` (e.g. `shopify-adapter.ts`, `razorpay-adapter.ts`) and
 * change this line. Nothing in app/ or components/ should need to change.
 */
export const commerce: CommerceAdapter = localAdapter;

export * from "./types";
export * from "./format";
