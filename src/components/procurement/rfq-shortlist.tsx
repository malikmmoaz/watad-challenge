"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import { reference } from "@/data";
import { formatSar, murabaha } from "@/domain/money";
import type { Halalas, OrgId, ShortlistReason } from "@/domain/types";
import { describeTerms } from "@/lib/procurement/comparison";
import { OfferComparison } from "./offer-comparison";
import { formatQuantity } from "@/lib/procurement/labels";
import { availableCredit } from "@/lib/procurement/po";
import { buildShortlist, estimateRfqValue, priceIndexFromOffers, type ShortlistRow } from "@/lib/procurement/shortlist";
import { Badge, CreditCapMeter, EmptyState, PageHeader, Panel, buttonClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { RFQ_STATUS } from "@/lib/status";
import { update, useDemo } from "@/store";


function Reason({ r }: { r: ShortlistReason }) {
  const positive = r.polarity === "positive";
  // Partial credit is not a failure: only reasons worth nothing get the red cross.
  const mark = positive ? "✓" : r.points > 0 ? "–" : "✗";
  const tone = positive ? "text-positive" : r.points > 0 ? "text-ink-muted" : "text-negative";
  return (
    <li className="flex gap-2">
      <span aria-hidden className={tone}>
        {mark}
      </span>
      <span className="sr-only">{positive ? "Why:" : "Why not:"}</span>
      <span className="flex-1">{r.text}</span>
      <span className="shrink-0 pl-2 tabular-nums text-ink-muted">+{r.points}</span>
    </li>
  );
}

function SupplierCard({ row, checked, onToggle, locked }: { row: ShortlistRow; checked?: boolean; onToggle?: () => void; locked: boolean }) {
  const [open, setOpen] = useState(false);
  const supplier = reference.suppliers.find((s) => s.id === row.supplierId);
  const why = row.reasons.filter((r) => r.polarity === "positive");
  const whyNot = row.reasons.filter((r) => r.polarity === "negative");
  return (
    <li data-testid={row.shortlisted ? "shortlist-row" : "shortlist-excluded"} data-supplier={row.supplierId} className="border-t border-line py-3 first:border-t-0">
      {/* Name and score on the first row; reasons span the card below, points at its right edge. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3">
        {onToggle ? (
          <input
            type="checkbox"
            data-testid="shortlist-select"
            aria-label={`Send RFQ to ${row.supplierName}`}
            className="mt-1.5 size-4"
            checked={checked}
            disabled={locked}
            onChange={onToggle}
          />
        ) : (
          <span aria-hidden />
        )}
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-ink">
            {row.supplierName}
            {row.newSupplierSlot && (
              <span data-testid="shortlist-new-slot" className="inline-flex h-6 items-center rounded-sm bg-stamp-soft px-2 text-xs font-medium text-stamp">
                New supplier slot
              </span>
            )}
            {row.recommended && <span className="inline-flex h-6 items-center rounded-sm bg-positive-soft px-2 text-xs font-medium text-positive">Recommended</span>}
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {supplier?.city} · {supplier?.localContent ? "Made in Saudi / local" : "Importer"} · {row.fitsCreditCap === true ? "Fits your credit cap" : row.fitsCreditCap === false ? "Above your available credit cap" : supplier?.acceptsPlatformCredit ? "Accepts platform credit" : "No platform credit"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-ink" data-testid="shortlist-score">{Math.round(row.matchScore)}</p>
          <p className="whitespace-nowrap text-xs text-ink-muted">match of 100</p>
        </div>
        <div className="col-span-2 col-start-2 min-w-0">
          <ul className="mt-2 space-y-1 text-sm" data-testid="shortlist-why">
            {why.slice(0, open ? why.length : 2).map((r) => (
              <Reason key={r.code} r={r} />
            ))}
          </ul>
          {whyNot.length > 0 && (
            <ul className="mt-1 space-y-1 text-sm" data-testid="shortlist-why-not">
              {whyNot.map((r) => (
                <Reason key={r.code} r={r} />
              ))}
              {row.whyNot.slice(whyNot.length).map((t) => (
                <li key={t} className="flex gap-2 text-ink-muted">
                  <span aria-hidden>·</span>
                  {t}
                </li>
              ))}
            </ul>
          )}
          {why.length > 2 && (
            <button type="button" className="mt-1.5 text-sm text-stamp underline decoration-stamp/35 underline-offset-[3px] hover:decoration-stamp" onClick={() => setOpen((o) => !o)}>
              {open ? "Show less" : `Show all ${why.length} reasons`}
            </button>
          )}
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
    return buildShortlist(reference.suppliers, rfq, { materials: reference.materials, facility: facility ? { available: availableCredit(facility) } : null, priceIndex });
  }, [rfq, rfqs, offers, facility]);

  const shortlistSize = shortlist?.shortlisted.length ?? 0;
  const viewedDraft = rfq?.status === "draft";
  useEffect(() => {
    if (viewedDraft) track("shortlist_viewed", { rfq_id: rfqId, supplier_count: shortlistSize });
  }, [rfqId, viewedDraft, shortlistSize]);

  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [blind, setBlind] = useState<boolean | null>(null);

  if (!rfq || !shortlist) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Contractor" title="RFQ not found" />
        <EmptyState title="This RFQ is not in this browser" action={<Link href="/contractor" className={buttonClass("secondary", "sm")}>Back to my RFQs</Link>}>
          It may have been created in another browser, or the demo data was reset.
        </EmptyState>
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
    track("rfq_sent", { rfq_id: rfq.id, line_count: rfq.lines.length, invited_suppliers: invited.length, wants_credit: rfq.wantsCredit });
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
        <Link href="/contractor" className="mb-3 inline-block text-sm text-stamp underline decoration-stamp/35 underline-offset-[3px] hover:decoration-stamp">
          My RFQs
        </Link>
        <PageHeader
          eyebrow="Request for quotation"
          title={rfq.title}
          serial={rfq.id}
          status={
            <Badge tone={RFQ_STATUS[rfq.status].tone}>
              <span data-testid="rfq-status" data-status={rfq.status}>
                {RFQ_STATUS[rfq.status].label}
              </span>
            </Badge>
          }
          meta={
            <>
              <span>Deliver to {rfq.deliverySite.includes(rfq.deliveryCity) ? rfq.deliverySite : `${rfq.deliverySite}, ${rfq.deliveryCity}`}</span>
              <span>by {formatDate(rfq.requiredBy)}</span>
              <span>{describeTerms(rfq.preferredTerms)}</span>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Panel title="Line items" className="lg:col-span-2" aside={<span className="text-sm tabular-nums text-ink-muted">About {formatSar(estimate)} incl. VAT</span>}>
          <ul aria-label="Line items" className="divide-y divide-line text-sm [&>li]:py-2">
            {rfq.lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="text-ink">{material(l.materialId)?.name ?? l.description}</span>
                <span className="tabular-nums text-ink-muted">{formatQuantity(l.quantity, l.unit)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-muted">Estimate incl. 15% VAT at 90-day benchmark prices (sample data). Offers set the real price.</p>
        </Panel>
        <Panel title="Credit cap">
          <div data-testid="credit-cap-panel">
          {facility ? (
            <div className="space-y-3 text-sm">
              <p className="text-ink-muted">
                Available
                <strong data-testid="credit-cap-available" className="mt-0.5 block text-2xl font-semibold tabular-nums tracking-[var(--tracking-heading)] text-ink">
                  {formatSar(availableCredit(facility))}
                </strong>
                of {formatSar(facility.cap)}
              </p>
              <p className="text-ink-muted">
                {estimate <= availableCredit(facility) ? "This RFQ fits within your available cap." : "This RFQ is above your available cap; part would need another payment method."}
              </p>
              <p className="text-ink-muted">
                Murabaha: {(facility.profitRate * 100).toFixed(1)}% profit rate for {facility.maxTenorDays} days (
                {(murabaha(estimate, facility.profitRate, facility.maxTenorDays).apr * 100).toFixed(1)}% APR) · supplier paid directly
              </p>
              <CreditCapMeter cap={facility.cap} drawn={facility.drawn} format={(n) => formatSar(n as Halalas)} barOnly />
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No approved credit cap yet. Apply from your contractor workspace to pay suppliers from a cap.</p>
          )}
          <p className="mt-3 border-t border-line pt-3 text-sm text-ink">{rfq.wantsCredit ? "You plan to pay this order from your credit cap." : "You plan to pay this order directly."}</p>
          </div>
        </Panel>
      </div>

      {!isDraft && <OfferComparison rfq={rfq} />}

      <Panel title={isDraft ? "Choose who receives this RFQ" : "Suppliers invited"}>
        <p className="mb-2 max-w-3xl text-sm text-ink-muted">
          Ranked on category fit, delivery to {rfq.deliveryCity}, reliability, likely to respond, price vs benchmark, credit cap, terms and local content. One slot is kept for a vetted supplier new to the platform.
        </p>
        <ul>
          {shown.map((row) => (
            <SupplierCard key={row.supplierId} row={row} locked={!isDraft} checked={selected.has(row.supplierId)} onToggle={() => toggle(row.supplierId)} />
          ))}
        </ul>
        <details className="mt-4 border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-muted hover:text-ink">
            {isDraft ? "Not shortlisted" : "Not invited"} ({rest.length}) and why
          </summary>
          <ul className="mt-1">
            {rest.map((row) => (
              <SupplierCard key={row.supplierId} row={row} locked />
            ))}
          </ul>
        </details>
        {isDraft ? (
          <div className="mt-4 border-t border-line pt-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" className="size-4" data-testid="rfq-blind-toggle" checked={isBlind} onChange={(e) => setBlind(e.target.checked)} />
            Blind comparison: hide supplier names on offers until I choose
          </label>
          </div>
        ) : null}
      </Panel>

      {isDraft ? (
        <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/95 p-3 shadow-float backdrop-blur sm:bottom-4 sm:p-4">
          <p className="hidden text-sm text-ink-muted sm:block">
            {selected.size} of {shown.length} shortlisted suppliers selected{isBlind ? " · blind comparison on" : ""}
          </p>
          <button type="button" data-testid="shortlist-send" disabled={selected.size === 0} onClick={send} className={buttonClass("primary", "md", "w-full sm:w-auto")}>
            Send RFQ to {selected.size} {selected.size === 1 ? "supplier" : "suppliers"}
          </button>
        </div>
      ) : (
        <p role="status" data-testid="shortlist-sent" className="rounded-xl bg-paper p-4 text-sm text-ink-muted">
          Sent to {rfq.invitedSupplierIds.length} suppliers{rfq.blindComparison ? ", blind comparison on" : ""}. Offers appear here as suppliers respond.
        </p>
      )}
    </div>
  );
}
