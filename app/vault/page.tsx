import type { Metadata } from "next";
import { PageStub } from "@/components/layout/PageStub";

export const metadata: Metadata = { title: "The Vault" };

// TEMPORARY: built in Phase 2.
export default function VaultPage() {
  return <PageStub label="Being catalogued · Phase 2" title="The Vault" line="The full grid of artifacts, with filters by Era and category." />;
}
