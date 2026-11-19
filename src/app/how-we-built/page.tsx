import type { Metadata } from "next";
import { LocalizedDocPage } from "@/components/docs/localized-doc-page";
import { SiteHeader } from "@/components/site-header";
import { howWeBuilt } from "@/content/how-we-built";
import { howWeBuiltAr } from "@/content/how-we-built.ar";

export const metadata: Metadata = { title: "How we built it" };

export default function Page() {
  return (
    <>
      <SiteHeader current="/how-we-built" />
      <LocalizedDocPage en={howWeBuilt} ar={howWeBuiltAr} />
    </>
  );
}
