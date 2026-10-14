import type { Metadata } from "next";
import { PageStub } from "@/components/layout/PageStub";

export const metadata: Metadata = { title: "Bag", robots: { index: false } };

// TEMPORARY: built in Phase 2.
export default function BagPage() {
  return <PageStub label="Being catalogued · Phase 2" title="Bag" line="Line items, sizes, quantities and checkout." />;
}
