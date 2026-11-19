import type { Metadata } from "next";
import { Suspense } from "react";
import { LocaleBoundary } from "@/components/i18n/locale-boundary";
import { T } from "@/components/i18n/t";
import { common } from "@/i18n/common";
import { msg } from "@/i18n/core";
import { SupplierRfq } from "@/components/procurement/supplier-rfq";
import { pageMetadata } from "@/i18n/meta";

export const metadata: Metadata = pageMetadata("supplierRfq");

async function Content({ params }: { params: PageProps<"/supplier/rfq/[id]">["params"] }) {
  const { id } = await params;
  return <SupplierRfq rfqId={id} />;
}

export default function Page({ params }: PageProps<"/supplier/rfq/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted"><T m={msg(common, (m) => m.loading.request)} /></p>}>
      <LocaleBoundary>
        <Content params={params} />
      </LocaleBoundary>
    </Suspense>
  );
}
