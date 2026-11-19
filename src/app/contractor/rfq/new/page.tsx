import type { Metadata } from "next";
import { RfqBuilder } from "@/components/procurement/rfq-builder";
import { pageMetadata } from "@/i18n/meta";

export const metadata: Metadata = pageMetadata("rfqNew");

export default function Page() {
  return <RfqBuilder />;
}
