import type { Metadata } from "next";
import { Suspense } from "react";
import { LocaleBoundary } from "@/components/i18n/locale-boundary";
import { CaseFile } from "@/components/credit/manager/case-file";
import { LoadingRows } from "@/components/ui";
import { pageMetadata } from "@/i18n/meta";

export const metadata: Metadata = pageMetadata("creditCase");

async function CaseFromParams({ params }: { params: PageProps<"/credit/cases/[id]">["params"] }) {
  const { id } = await params;
  return <CaseFile id={id} />;
}

/** Case ids include ones created in the browser, so the id is read at request time inside Suspense. */
export default function Page({ params }: PageProps<"/credit/cases/[id]">) {
  return (
    <Suspense fallback={<LoadingRows rows={6} label="Loading credit case" />}>
      <LocaleBoundary>
        <CaseFromParams params={params} />
      </LocaleBoundary>
    </Suspense>
  );
}
