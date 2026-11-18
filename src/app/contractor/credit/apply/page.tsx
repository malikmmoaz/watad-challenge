import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationForm } from "@/components/credit/application-form";
import { demoPersona, reference } from "@/data";

export const metadata: Metadata = { title: "Apply for credit · Contractor" };

export default function Page() {
  const contractor = reference.contractors.find((c) => c.id === demoPersona.contractor);
  if (!contractor) throw new Error("Demo contractor persona is missing from the sample data.");
  return (
    <div className="space-y-6">
      <Link href="/contractor/credit" className="text-sm text-neutral-600 underline">
        ← Back to credit
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Apply for a credit cap</h1>
        <p className="text-neutral-700">Takes about five minutes with your documents to hand. Each document says why the credit manager needs it.</p>
      </div>
      <ApplicationForm contractor={contractor} />
    </div>
  );
}
