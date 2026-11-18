import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationForm } from "@/components/credit/application-form";
import { PageHeader, SampleDataLabel } from "@/components/ui";
import { demoPersona, reference } from "@/data";

export const metadata: Metadata = { title: "Apply for credit · Contractor" };

export default function Page() {
  const contractor = reference.contractors.find((c) => c.id === demoPersona.contractor);
  if (!contractor) throw new Error("Demo contractor persona is missing from the sample data.");
  return (
    <div className="space-y-6">
      <Link href="/contractor/credit" className="text-sm text-stamp underline underline-offset-[3px]">
        Back to credit
      </Link>
      <PageHeader
        title="Apply for a credit cap"
        status={<SampleDataLabel />}
        meta="About five minutes with your documents to hand. Each document says why the credit manager needs it."
      />
      <ApplicationForm contractor={contractor} />
    </div>
  );
}
