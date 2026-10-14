import type { Metadata } from "next";
import { PageStub } from "@/components/layout/PageStub";

export const metadata: Metadata = { title: "Evidence" };

// TEMPORARY: built in Phase 4.
export default function EvidencePage() {
  return <PageStub label="Being catalogued · Phase 4" title="Evidence" line="The lookbook: full-bleed images, each linked to its artifact." />;
}
