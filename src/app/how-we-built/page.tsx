import type { Metadata } from "next";
import { LocalizedDocPage } from "@/components/docs/localized-doc-page";
import { SiteHeader } from "@/components/site-header";
import { howWeBuilt } from "@/content/how-we-built";
import { howWeBuiltAr } from "@/content/how-we-built.ar";
import { pageMetadata } from "@/i18n/meta";

export const metadata: Metadata = pageMetadata("howWeBuilt");

export default function Page() {
  return (
    <>
      <SiteHeader current="/how-we-built" />
      <LocalizedDocPage en={howWeBuilt} ar={howWeBuiltAr} />
    </>
  );
}
