"use client";

import Link from "next/link";
import { demoPersona } from "@/data";
import { useDemo } from "@/store";

/** The contractor's RFQs, newest first, with the entry point to create one. */
export function RfqList() {
  const rfqs = useDemo((s) => s.rfqs);
  const mine = rfqs.filter((r) => r.contractorId === demoPersona.contractor);
  return (
    <section aria-label="My RFQs" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">My RFQs</h2>
        <Link href="/contractor/rfq/new" data-testid="rfq-new" className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
          New RFQ
        </Link>
      </div>
      <ul className="divide-y divide-neutral-200 rounded border border-neutral-200 bg-white">
        {mine.map((r) => (
          <li key={r.id} data-testid="rfq-row" className="flex flex-wrap items-baseline justify-between gap-2 p-3 text-sm">
            <span>
              <Link href={`/contractor/rfq/${r.id}`} className="font-medium underline-offset-2 hover:underline">{r.title}</Link> <span className="font-mono text-neutral-600">{r.id}</span>
            </span>
            <span className="text-neutral-700">
              {r.lines.length} lines · {r.deliveryCity} · by {r.requiredBy.slice(0, 10)} · {r.source === "upload" ? "from upload" : "from catalog"} · <span className="capitalize">{r.status.replace(/_/g, " ")}</span>
            </span>
          </li>
        ))}
        {mine.length === 0 && <li className="p-3 text-sm text-neutral-600">No RFQs yet.</li>}
      </ul>
    </section>
  );
}
