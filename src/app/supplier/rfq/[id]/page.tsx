import type { Metadata } from "next";
import { Suspense } from "react";
import { SupplierRfq } from "@/components/procurement/supplier-rfq";

export const metadata: Metadata = { title: "Request for quotation" };

async function Content({ params }: { params: PageProps<"/supplier/rfq/[id]">["params"] }) {
  const { id } = await params;
  return <SupplierRfq rfqId={id} />;
}

export default function Page({ params }: PageProps<"/supplier/rfq/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading request…</p>}>
      <Content params={params} />
    </Suspense>
  );
}
