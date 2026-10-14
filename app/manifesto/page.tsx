import type { Metadata } from "next";
import { PageStub } from "@/components/layout/PageStub";

export const metadata: Metadata = { title: "Manifesto" };

// TEMPORARY: built in Phase 4.
export default function ManifestoPage() {
  return <PageStub label="Being catalogued · Phase 4" title="Manifesto" line="Why OUTLIVED exists, in eight short statements." />;
}
