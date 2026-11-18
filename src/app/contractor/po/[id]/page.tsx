import type { Metadata } from "next";
import { Suspense } from "react";
import { PoDetail } from "@/components/procurement/po-detail";

export const metadata: Metadata = { title: "Purchase order" };

async function Content({ params }: { params: PageProps<"/contractor/po/[id]">["params"] }) {
  const { id } = await params;
  return <PoDetail poId={id} />;
}

export default function Page({ params }: PageProps<"/contractor/po/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading purchase order…</p>}>
      <Content params={params} />
    </Suspense>
  );
}
