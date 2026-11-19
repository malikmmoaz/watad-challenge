import type { Metadata } from "next";
import { Suspense } from "react";
import { LocaleBoundary } from "@/components/i18n/locale-boundary";
import { T } from "@/components/i18n/t";
import { common } from "@/i18n/common";
import { msg } from "@/i18n/core";
import { PoDetail } from "@/components/procurement/po-detail";

export const metadata: Metadata = { title: "Purchase order" };

async function Content({ params }: { params: PageProps<"/contractor/po/[id]">["params"] }) {
  const { id } = await params;
  return <PoDetail poId={id} />;
}

export default function Page({ params }: PageProps<"/contractor/po/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted"><T m={msg(common, (m) => m.loading.po)} /></p>}>
      <LocaleBoundary>
        <Content params={params} />
      </LocaleBoundary>
    </Suspense>
  );
}
