import type { Metadata } from "next";
import { ContractorCredit } from "@/components/credit/contractor-credit";
import { pageMetadata } from "@/i18n/meta";

export const metadata: Metadata = pageMetadata("contractorCredit");

export default function Page() {
  return <ContractorCredit />;
}
