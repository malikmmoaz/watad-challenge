"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { reference } from "@/data";
import { formatSar, murabaha } from "@/domain/money";
import type { OrgId, ShortlistReason } from "@/domain/types";
import { describeTerms } from "@/lib/procurement/comparison";
import { UNIT_LABELS } from "@/lib/procurement/labels";
import { buildShortlist, estimateRfqValue, priceIndexFromOffers, type ShortlistRow } from "@/lib/procurement/shortlist";
import { update, useDemo } from "@/store";

const card = "rounded border border-neutral-200 bg-white p-4";

function Reason({ r }: { r: ShortlistReason }) {
  const positive = r.polarity === "positive";
  return (
    <li className="flex gap-2">
      <span aria-hidden className={positive ? "text-emerald-700" : "text-rose-700"}>
        {positive ? "✓" : "✗"}
      </span>
      <span className="sr-only">{positive ? "Why:" : "Why not:"}</span>
      <span className="flex-1">{r.text}</span>
      <span className="tabular-nums text-neutral-500">+{r.points}</span>
    </li>
  );
}

function SupplierCard({ row, checked, onToggle, locked }: { row: ShortlistRow; checked?: boolean; onToggle?: () => void; locked: boolean }) {
  const [open, setOpen] = useState(false);
  const supplier = reference.suppliers.find((s) => s.id === row.supplierId);
  const why = row.reasons.filter((r) => r.polarity === "positive");
  const whyNot = row.reasons.filter((r) => r.polarity === "negative");
  return (
    <li data-testid={row.shortlisted ? "shortlist-row" : "shortlist-excluded"} data-supplier={row.supplierId} className="rounded border border-neutral-200 p-3">
      <div className="flex flex-wrap items-start gap-3">
        {onToggle && (
          <input
            type="checkbox"
            data-testid="shortlist-select"
            aria-label={`Send RFQ to ${row.supplierName}`}
            className="mt-1.5 size-4"
            checked={checked}
            disabled={locked}
            onChange={onToggle}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {row.supplierName}
            {row.newSupplierSlot && (
              <span data-testid="shortlist-new-slot" className="ml-2 rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-xs text-sky-900">
                New supplier slot
              </span>
            )}
            {row.recommended && <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700">Recommended</span>}
          </p>
          <p className="text-sm text-neutral-600">
            {supplier?.city} · {supplier?.localContent ? "Made in Saudi / local" : "Importer"} · {row.fitsCreditCap === true ? "Fits your credit cap" : row.fitsCreditCap === false ? "Above your available credit cap" : supplier?.acceptsPlatformCredit ? "Accepts platform credit" : "No platform credit"}
          </p>
          <ul className="mt-2 space-y-0.5 text-sm" data-testid="shortlist-why">
            {why.slice(0, open ? why.length : 2).map((r) => (
              <Reason key={r.code} r={r} />
            ))}
          </ul>
          {whyNot.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-sm" data-testid="shortlist-why-not">
              {whyNot.map((r) => (
                <Reason key={r.code} r={r} />
              ))}
              {row.whyNot.slice(whyNot.length).map((t) => (
                <li key={t} className="flex gap-2 text-neutral-600">
                  <span aria-hidden>·</span>
                  {t}
                </li>
              ))}
            </ul>
          )}
          {why.length > 2 && (
            <button type="button" className="mt-1 text-sm text-neutral-600 underline" onClick={() => setOpen((o) => !o)}>
              {open ? "Show less" : `Show all ${why.length} reasons`}
            </button>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums" data-testid="shortlist-score">{row.matchScore}</p>
          <p className="text-xs text-neutral-600">match / 100</p>
        </div>
      </div>
    </li>
  );
}

export function RfqShortlist({ rfqId }: { rfqId: string }) {
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const facilities = useDemo((s) => s.creditFacilities);
  const rfq = rfqs.find((r) => r.id === rfqId);
  const facility = rfq ? (facilities.find((f) => f.contractorId === rfq.contractorId) ?? null) : null;

  const shortlist = useMemo(() => {
    if (!rfq) return null;
    const priceIndex = priceIndexFromOffers(rfqs, offers, reference.materials);
    return buildShortlist(reference.suppliers, rfq, { materials: reference.materials, facility, priceIndex });
  }, [rfq, rfqs, offers, facility]);

  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [blind, setBlind] = useState<boolean | null>(null);

  if (!rfq || !shortlist) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">RFQ not found</h1>
        <p className="text-sm text-neutral-700">It may have been created in another browser, or the demo data was reset.</p>
        <Link href="/contractor" className="underline">Back to my RFQs</Link>
      </div>
    );
  }

  const isDraft = rfq.status === "draft";
  const selected = picked ?? new Set(isDraft ? shortlist.shortlisted.filter((r) => r.recommended || r.newSupplierSlot).map((r) => r.supplierId) : rfq.invitedSupplierIds);
  const isBlind = blind ?? rfq.blindComparison;
  const estimate = estimateRfqValue(rfq, reference.materials);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };
  const send = () => {
    const invited = shortlist.shortlisted.filter((r) => selected.has(r.supplierId)).map((r) => r.supplierId as OrgId);
    update((prev) => ({
      ...prev,
      rfqs: prev.rfqs.map((r) => (r.id === rfq.id ? { ...r, status: "sent", invitedSupplierIds: invited, blindComparison: isBlind } : r)),
    }));
  };
  const material = (id: string) => reference.materials.find((m) => m.id === id);
  // Once sent, show who was actually invited (the ranking may have moved since), not today's shortlist.
  const everyone = [...shortlist.shortlisted, ...shortlist.notShortlisted];
  const invited = new Set<string>(rfq.invitedSupplierIds);
  const shown = isDraft ? shortlist.shortlisted : everyone.filter((r) => invited.has(r.supplierId)).map((r) => ({ ...r, shortlisted: true }));
  const rest = isDraft ? shortlist.notShortlisted : everyone.filter((r) => !invited.has(r.supplierId)).map((r) => ({ ...r, shortlisted: false }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm"><Link href="/contractor" className="text-neutral-600 underline">My RFQs</Link></p>
        <h1 className="text-2xl font-semibold">{rfq.title}</h1>
        <p className="mt-1 text-sm text-neutral-700">
          <span className="font-mono">{rfq.id}</span> · deliver to {rfq.deliverySite}, {rfq.deliveryCity} by {rfq.requiredBy.slice(0, 10)} · {describeTerms(rfq.preferredTerms)} ·{" "}
          <span data-testid="rfq-status" className="capitalize">{rfq.status.replace(/_/g, " ")}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className={`${card} md:col-span-2`} aria-label="Line items">
          <h2 className="mb-2 font-semibold">Line items</h2>
          <ul className="space-y-1 text-sm">
            {rfq.lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span>{material(l.materialId)?.name ?? l.description}</span>
                <span className="tabular-nums text-neutral-700">{l.quantity.toLocaleString("en-US")} {UNIT_LABELS[l.unit]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-neutral-700">About {formatSar(estimate)} incl. 15% VAT at 90-day benchmark prices (sample data).</p>
        </section>
        <section className={card} aria-label="Credit cap" data-testid="credit-cap-panel">
          <h2 className="mb-2 font-semibold">Credit cap</h2>
          {facility ? (
            <div className="space-y-1 text-sm">
              <p>
                Available <strong data-testid="credit-cap-available" className="tabular-nums">{formatSar(facility.available)}</strong> of {formatSar(facility.cap)}
              </p>
              <p className="text-neutral-700">
                {estimate <= facility.available ? "This RFQ fits within your available cap." : "This RFQ is above your available cap; part would need another payment method."}
              </p>
              <p className="text-neutral-600">
                Murabaha markup {(facility.profitRate * 100).toFixed(1)}% flat for {facility.maxTenorDays} days (APR{" "}
                {((murabaha(estimate, facility.profitRate, facility.maxTenorDays).apr) * 100).toFixed(1)}%) · supplier paid directly
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-700">No approved credit cap yet. Apply from your contractor workspace to pay suppliers from a cap.</p>
          )}
          <p className="mt-2 text-sm">{rfq.wantsCredit ? "You plan to pay this order from your credit cap." : "You plan to pay this order directly."}</p>
        </section>
      </div>

      <section className={card} aria-label="Supplier shortlist">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{isDraft ? "Choose who receives this RFQ" : "Suppliers invited"}</h2>
          <p className="text-sm text-neutral-600">
            Ranked on category fit, delivery to {rfq.deliveryCity}, reliability, likely to respond, price vs benchmark, credit cap, terms and local content. One slot is kept for a vetted supplier new to the platform.
          </p>
        </div>
        <ul className="space-y-3">
          {shown.map((row) => (
            <SupplierCard key={row.supplierId} row={row} locked={!isDraft} checked={selected.has(row.supplierId)} onToggle={() => toggle(row.supplierId)} />
          ))}
        </ul>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-neutral-700">
            {isDraft ? "Not shortlisted" : "Not invited"} ({rest.length}) and why
          </summary>
          <ul className="mt-3 space-y-3">
            {rest.map((row) => (
              <SupplierCard key={row.supplierId} row={row} locked />
            ))}
          </ul>
        </details>
      </section>

      {isDraft ? (
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" data-testid="rfq-blind-toggle" checked={isBlind} onChange={(e) => setBlind(e.target.checked)} />
            Blind comparison: hide supplier names on offers until I choose
          </label>
          <button type="button" data-testid="shortlist-send" disabled={selected.size === 0} onClick={send} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:bg-neutral-300">
            Send RFQ to {selected.size} {selected.size === 1 ? "supplier" : "suppliers"}
          </button>
        </div>
      ) : (
        <p role="status" data-testid="shortlist-sent" className="text-sm text-neutral-700">
          Sent to {rfq.invitedSupplierIds.length} suppliers{rfq.blindComparison ? ", blind comparison on" : ""}. Offers appear here as suppliers respond.
        </p>
      )}
    </div>
  );
}
