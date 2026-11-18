import Link from "next/link";
import { DemoCounts } from "@/components/demo-counts";
import { RfqList } from "@/components/procurement/rfq-list";

/** Placeholder landing for this role area. Owner: Omar (procurement, #8 #9 #11) and Hana (credit application, #12). */
export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Contractor workspace</h1>
      <p className="text-neutral-700">This area is being built. The numbers below are read live from the shared demo store.</p>
      <Link href="/contractor/credit" data-testid="contractor-credit-link" className="inline-block rounded border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:border-neutral-900">
        Credit: cap, applications and progress →
      </Link>
      <RfqList />
      <DemoCounts />
    </div>
  );
}
