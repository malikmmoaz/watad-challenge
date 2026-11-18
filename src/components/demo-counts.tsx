"use client";

import { useDemo } from "@/store";

/** Live counts from the demo store; proves the store wiring for each role area. */
export function DemoCounts() {
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const pos = useDemo((s) => s.purchaseOrders);
  const cases = useDemo((s) => s.creditCases);
  const items = [
    ["RFQs", rfqs.length],
    ["Offers", offers.length],
    ["Purchase orders", pos.length],
    ["Credit cases", cases.length],
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([label, n]) => (
        <div key={label} className="rounded border border-neutral-200 bg-white p-4">
          <dt className="text-sm text-neutral-600">{label}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{n}</dd>
        </div>
      ))}
    </dl>
  );
}
