import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { SiteHeader } from "@/components/site-header";
import { about } from "@/content/about";

export const metadata: Metadata = { title: "About" };

export default function Page() {
  return (
    <>
      <SiteHeader current="/about" />
      <DocPage page={about} />
    </>
  );
}
