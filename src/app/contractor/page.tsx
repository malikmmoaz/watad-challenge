import { DemoCounts } from "@/components/demo-counts";
import { RfqList } from "@/components/procurement/rfq-list";

/** Placeholder landing for this role area. Owner: Omar (procurement, #8 #9 #11) and Hana (credit application, #12). */
export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Contractor workspace</h1>
      <p className="text-neutral-700">This area is being built. The numbers below are read live from the shared demo store.</p>
      <RfqList />
      <DemoCounts />
    </div>
  );
}
