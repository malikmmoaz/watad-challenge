import type { Metadata } from "next";
import { Suspense } from "react";
import { LocaleBoundary } from "@/components/i18n/locale-boundary";
import { T } from "@/components/i18n/t";
import { common } from "@/i18n/common";
import { msg } from "@/i18n/core";
import { PoDetail } from "@/components/procurement/po-detail";
import { pageMetadata } from "@/i18n/meta";

export const metadata: Metadata = pageMetadata("supplierPo");

async function Content({ params }: { params: PageProps<"/supplier/po/[id]">["params"] }) {
  const { id } = await params;
  return <PoDetail poId={id} viewer="supplier" />;
}

export default function Page({ params }: PageProps<"/supplier/po/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted"><T m={msg(common, (m) => m.loading.po)} /></p>}>
      <LocaleBoundary>
        <Content params={params} />
      </LocaleBoundary>
    </Suspense>
  );
}
