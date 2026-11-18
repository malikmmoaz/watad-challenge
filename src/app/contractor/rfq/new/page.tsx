import type { Metadata } from "next";
import { RfqBuilder } from "@/components/procurement/rfq-builder";

export const metadata: Metadata = { title: "New RFQ" };

export default function Page() {
  return <RfqBuilder />;
}
