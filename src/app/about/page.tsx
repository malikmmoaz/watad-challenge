import type { Metadata } from "next";
import { LocalizedDocPage } from "@/components/docs/localized-doc-page";
import { SiteHeader } from "@/components/site-header";
import { about } from "@/content/about";
import { aboutAr } from "@/content/about.ar";
import { pageMetadata } from "@/i18n/meta";

export const metadata: Metadata = pageMetadata("about");

export default function Page() {
  return (
    <>
      <SiteHeader current="/about" />
      <LocalizedDocPage en={about} ar={aboutAr} />
    </>
  );
}
