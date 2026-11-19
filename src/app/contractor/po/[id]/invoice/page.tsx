import type { Metadata } from "next";
import { Suspense } from "react";
import { LocaleBoundary } from "@/components/i18n/locale-boundary";
import { T } from "@/components/i18n/t";
import { common } from "@/i18n/common";
import { msg } from "@/i18n/core";
import { TaxInvoice } from "@/components/invoice/tax-invoice";

export const metadata: Metadata = { title: "Tax invoice" };

async function Content({ params }: { params: PageProps<"/contractor/po/[id]/invoice">["params"] }) {
  const { id } = await params;
  return <TaxInvoice poId={id} viewer="contractor" />;
}

export default function Page({ params }: PageProps<"/contractor/po/[id]/invoice">) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted"><T m={msg(common, (m) => m.loading.po)} /></p>}>
      <LocaleBoundary>
        <Content params={params} />
      </LocaleBoundary>
    </Suspense>
  );
}
