import type { Metadata } from "next";
import { ContractorCredit } from "@/components/credit/contractor-credit";

export const metadata: Metadata = { title: "Credit · Contractor" };

export default function Page() {
  return <ContractorCredit />;
}
