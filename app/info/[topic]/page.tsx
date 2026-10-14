import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { SIZE_GUIDE } from "@/data/size-guide";
import { SITE } from "@/data/site";

type Topic = { title: string; body: ReactNode };

// PLACEHOLDER: all policy copy below is dummy text. Replace with your real policies
// (payment providers such as Razorpay require shipping, refund, privacy, terms and contact pages).
const TOPICS: Record<string, Topic> = {
  "shipping-returns": {
    title: "Shipping & Returns",
    body: (
      <>
        <p>Free shipping across India on all orders. Orders leave the archive within 2 working days and arrive in 3–7 working days.</p>
        <p>Returns and size exchanges are accepted within 7 days of delivery for unworn pieces with tags attached.</p>
      </>
    ),
  },
  "size-guide": {
    title: "Size Guide",
    body: (
      <>
        <p>Measurements are in centimetres, taken with the garment laid flat. Every piece is cut oversized; size down for a closer fit.</p>
        {Object.entries(SIZE_GUIDE).map(([category, rows]) => (
          <div key={category} className="overflow-x-auto">
            <h2 className="mb-3 mt-8 text-[20px] font-bold uppercase tracking-[-0.01em]">{category}</h2>
            <table className="mono w-full min-w-[22rem] border-collapse text-left text-bone">
              <thead className="text-ash">
                <tr>
                  {["Size", "Chest", "Length", "Sleeve"].map((h) => (
                    <th key={h} scope="col" className="border-b border-line py-3 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.size}>
                    <th scope="row" className="border-b border-line py-3 font-normal">{r.size}</th>
                    <td className="border-b border-line py-3">{r.chest}</td>
                    <td className="border-b border-line py-3">{r.length}</td>
                    <td className="border-b border-line py-3">{r.sleeve}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </>
    ),
  },
  contact: {
    title: "Contact",
    body: (
      <>
        <p>
          Email <a className="underline decoration-rust underline-offset-4" href={`mailto:${SITE.email}`}>{SITE.email}</a> or
          message us on WhatsApp at {SITE.whatsapp}. We reply within one working day.
        </p>
      </>
    ),
  },
  privacy: {
    title: "Privacy",
    body: <p>We only collect what we need to deliver your order and, if you opt in, to tell you when a new Era is recovered.</p>,
  },
  terms: {
    title: "Terms",
    body: <p>Terms of sale will be published here before checkout opens.</p>,
  },
};

export function generateStaticParams() {
  return Object.keys(TOPICS).map((topic) => ({ topic }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic } = await params;
  return { title: TOPICS[topic]?.title };
}

export default async function InfoPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const page = TOPICS[topic];
  if (!page) notFound();

  return (
    <article className="gutter max-w-3xl pb-10 pt-20">
      <MonoLabel>Information</MonoLabel>
      <h1 className="mb-10 mt-4 text-[44px] font-extrabold uppercase leading-[0.9] tracking-[-0.04em] md:text-[72px]">
        {page.title}
      </h1>
      <div className="flex flex-col gap-5 text-[17px] leading-relaxed text-bone">{page.body}</div>
    </article>
  );
}
