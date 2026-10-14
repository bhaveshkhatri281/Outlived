import type { Metadata } from "next";
import { BagView } from "@/components/bag/BagView";

export const metadata: Metadata = { title: "Bag", robots: { index: false } };

export default function BagPage() {
  return (
    <>
      <h1 className="gutter pb-8 pt-12 text-[56px] font-extrabold uppercase leading-[0.85] tracking-[-0.05em] md:pt-16 md:text-[96px]">Bag</h1>
      <BagView />
    </>
  );
}
