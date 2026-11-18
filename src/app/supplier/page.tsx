import { DemoCounts } from "@/components/demo-counts";

/** Placeholder landing for this role area. Owner: Omar (#10). */
export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Supplier portal</h1>
      <p className="text-ink-muted">This area is being built. The numbers below are read live from the shared demo store.</p>
      <DemoCounts />
    </div>
  );
}
