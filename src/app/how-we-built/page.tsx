import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { SiteHeader } from "@/components/site-header";
import { howWeBuilt } from "@/content/how-we-built";

export const metadata: Metadata = { title: "How we built it" };

export default function Page() {
  return (
    <>
      <SiteHeader current="/how-we-built" />
      <DocPage page={howWeBuilt} />
    </>
  );
}
