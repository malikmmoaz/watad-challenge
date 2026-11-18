import type { Metadata } from "next";
import { Suspense } from "react";
import { RfqShortlist } from "@/components/procurement/rfq-shortlist";

export const metadata: Metadata = { title: "RFQ" };

// The RFQ lives in the browser's demo store, so the id is only read here and passed down.
async function Content({ params }: { params: PageProps<"/contractor/rfq/[id]">["params"] }) {
  const { id } = await params;
  return <RfqShortlist rfqId={id} />;
}

export default function Page({ params }: PageProps<"/contractor/rfq/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading RFQ…</p>}>
      <Content params={params} />
    </Suspense>
  );
}
