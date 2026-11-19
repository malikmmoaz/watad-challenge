import type { Metadata } from "next";
import { ApplicationForm, ApplyHeader } from "@/components/credit/application-form";
import { demoPersona, reference } from "@/data";
import { pageMetadata } from "@/i18n/meta";

export const metadata: Metadata = pageMetadata("creditApply");

export default function Page() {
  const contractor = reference.contractors.find((c) => c.id === demoPersona.contractor);
  if (!contractor) throw new Error("Demo contractor persona is missing from the sample data.");
  return (
    <div className="space-y-6">
      <ApplyHeader />
      <ApplicationForm contractor={contractor} />
    </div>
  );
}
