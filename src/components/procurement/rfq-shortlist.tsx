"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import { reference } from "@/data";
import { murabaha } from "@/domain/money";
import type { Halalas, OrgId } from "@/domain/types";
import { OfferComparison } from "./offer-comparison";
import { availableCredit } from "@/lib/procurement/po";
import { useProcurementI18n } from "./use-procurement-i18n";
import type { LocalizableReason } from "@/lib/procurement/shortlist";
import { buildShortlist, estimateRfqValue, priceIndexFromOffers, type ShortlistRow } from "@/lib/procurement/shortlist";
import { Badge, CreditCapMeter, EmptyState, PageHeader, Panel, buttonClass } from "@/components/ui";
import { RFQ_STATUS } from "@/lib/status";
import { update, useDemo } from "@/store";


/** A shortlist reason in the reader's locale: English keeps the logic's own text; Arabic renders the message with its raw values. */
function useReasonText() {
  const { ar, m, f, fill, city, category } = useProcurementI18n();
  return (r: LocalizableReason): string => {
    if (!ar) return r.text;
    const template = (m.reasons as Record<string, string>)[r.msg.key];
    if (!template) return r.text;
    const v = r.msg.values;
    const list = (codes: unknown) => String(codes ?? "").split(",").filter(Boolean).map((c) => category(c as Parameters<typeof category>[0])).join("، ");
    return fill(template, {
      ...v,
      ...(v.city !== undefined ? { city: city(v.city as Parameters<typeof city>[0]) } : {}),
      ...(v.categories !== undefined ? { categories: list(v.categories) } : {}),
      ...(v.missing !== undefined ? { missing: list(v.missing) } : {}),
      ...(typeof v.pct === "number" && v.pct < 1 && r.msg.key !== "priceBelow" && r.msg.key !== "priceAbove" ? { pct: f.percent(v.pct) } : {}),
      ...(v.estimate !== undefined ? { estimate: f.money(v.estimate as never) } : {}),
      ...(v.available !== undefined ? { available: f.money(v.available as never) } : {}),
    });
  };
}

function Reason({ r }: { r: LocalizableReason }) {
  const { m } = useProcurementI18n();
  const text = useReasonText();
  const positive = r.polarity === "positive";
  // Partial credit is not a failure: only reasons worth nothing get the red cross.
  const mark = positive ? "✓" : r.points > 0 ? "–" : "✗";
  const tone = positive ? "text-positive" : r.points > 0 ? "text-ink-muted" : "text-negative";
  return (
    <li className="flex gap-2">
      <span aria-hidden className={tone}>
        {mark}
      </span>
      <span className="sr-only">{positive ? m.rfqPage.why : m.rfqPage.whyNot}</span>
      <span className="flex-1">{text(r)}</span>
      <span className="shrink-0 pl-2 tabular-nums text-ink-muted">+{r.points}</span>
    </li>
  );
}

function SupplierCard({ row, checked, onToggle, locked }: { row: ShortlistRow; checked?: boolean; onToggle?: () => void; locked: boolean }) {
  const [open, setOpen] = useState(false);
  const supplier = reference.suppliers.find((s) => s.id === row.supplierId);
  const why = row.reasons.filter((r) => r.polarity === "positive");
  const whyNot = row.reasons.filter((r) => r.polarity === "negative");
  const { ar, m, fill, city, name } = useProcurementI18n();
  const p = m.rfqPage;
  // "Match score 54 is below the top 5", added by buildShortlist, in the reader's locale.
  const extra = (t: string) => {
    const below = ar ? t.match(/^Match score ([\d.]+) is below the top (\d+)$/) : null;
    return below ? fill(m.reasons.belowTop, { score: below[1]!, size: below[2]! }) : t;
  };
  return (
    <li data-testid={row.shortlisted ? "shortlist-row" : "shortlist-excluded"} data-supplier={row.supplierId} className="border-t border-line py-3 first:border-t-0">
      {/* Name and score on the first row; reasons span the card below, points at its right edge. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3">
        {onToggle ? (
          <input
            type="checkbox"
            data-testid="shortlist-select"
            aria-label={fill(p.sendTo, { name: name(supplier, row.supplierName) })}
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
            {name(supplier, row.supplierName)}
            {row.newSupplierSlot && (
              <span data-testid="shortlist-new-slot" className="inline-flex h-6 items-center rounded-sm bg-stamp-soft px-2 text-xs font-medium text-stamp">
                {p.newSupplierSlot}
              </span>
            )}
            {row.recommended && <span className="inline-flex h-6 items-center rounded-sm bg-positive-soft px-2 text-xs font-medium text-positive">{p.recommended}</span>}
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {supplier ? city(supplier.city) : ""} · {supplier?.localContent ? p.local : p.importer} · {row.fitsCreditCap === true ? p.fitsCap : row.fitsCreditCap === false ? p.aboveCap : supplier?.acceptsPlatformCredit ? p.acceptsCredit : p.noCredit}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-ink" data-testid="shortlist-score">{Math.round(row.matchScore)}</p>
          <p className="whitespace-nowrap text-xs text-ink-muted">{p.matchOf100}</p>
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
                  {extra(t)}
                </li>
              ))}
            </ul>
          )}
          {why.length > 2 && (
            <button type="button" className="mt-1.5 text-sm text-stamp underline decoration-stamp/35 underline-offset-[3px] hover:decoration-stamp" onClick={() => setOpen((o) => !o)}>
              {open ? p.showLess : fill(p.showAll, { n: why.length })}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function RfqShortlist({ rfqId }: { rfqId: string }) {
  const { m, status, f, fill, terms, qty, name, city, rfqTitle, site } = useProcurementI18n();
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
        <PageHeader eyebrow={m.common.contractor} title={m.rfqPage.notFound} />
        <EmptyState title={m.rfqPage.notInBrowser} action={<Link href="/contractor" className={buttonClass("secondary", "sm")}>{m.common.backToMyRfqs}</Link>}>
          {m.common.notInBrowser}
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
          {m.common.myRfqs}
        </Link>
        <PageHeader
          eyebrow={m.rfqPage.eyebrow}
          title={rfqTitle(rfq)}
          serial={rfq.id}
          status={
            <Badge tone={RFQ_STATUS[rfq.status].tone}>
              <span data-testid="rfq-status" data-status={rfq.status}>
                {status.rfq[rfq.status]}
              </span>
            </Badge>
          }
          meta={
            <>
              <span>
                {m.common.deliverTo} {site(rfq)}
              </span>
              <span>{fill(m.rfqPage.deliverBy, { date: f.date(rfq.requiredBy) })}</span>
              <span>{terms(rfq.preferredTerms)}</span>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Panel title={m.rfqPage.lineItems} className="lg:col-span-2" aside={<span className="text-sm tabular-nums text-ink-muted">{fill(m.rfqPage.estimateAside, { total: f.money(estimate) })}</span>}>
          <ul aria-label={m.rfqPage.lineItems} className="divide-y divide-line text-sm [&>li]:py-2">
            {rfq.lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="text-ink">{name(material(l.materialId), l.description)}</span>
                <span className="tabular-nums text-ink-muted">{qty(l.quantity, l.unit)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-muted">{m.rfqPage.estimateNote}</p>
        </Panel>
        <Panel title={m.rfqPage.creditCap}>
          <div data-testid="credit-cap-panel">
          {facility ? (
            <div className="space-y-3 text-sm">
              <p className="text-ink-muted">
                {m.rfqPage.available}
                <strong data-testid="credit-cap-available" className="mt-0.5 block text-2xl font-semibold tabular-nums tracking-[var(--tracking-heading)] text-ink">
                  {f.money(availableCredit(facility))}
                </strong>
                {fill(m.rfqPage.ofCap, { cap: f.money(facility.cap) })}
              </p>
              <p className="text-ink-muted">
                {estimate <= availableCredit(facility) ? m.rfqPage.fits : m.rfqPage.over}
              </p>
              <p className="text-ink-muted">
                {fill(m.rfqPage.murabaha, {
                  rate: f.percent(facility.profitRate, 1),
                  days: facility.maxTenorDays,
                  apr: f.percent(murabaha(estimate, facility.profitRate, facility.maxTenorDays).apr, 1),
                })}
              </p>
              <CreditCapMeter cap={facility.cap} drawn={facility.drawn} format={(n) => f.money(n as Halalas)} barOnly />
            </div>
          ) : (
            <p className="text-sm text-ink-muted">{m.rfqPage.noCap}</p>
          )}
          <p className="mt-3 border-t border-line pt-3 text-sm text-ink">{rfq.wantsCredit ? m.rfqPage.planCredit : m.rfqPage.planDirect}</p>
          </div>
        </Panel>
      </div>

      {!isDraft && <OfferComparison rfq={rfq} />}

      <Panel title={isDraft ? m.rfqPage.chooseWho : m.rfqPage.invited}>
        <p className="mb-2 max-w-3xl text-sm text-ink-muted">
          {fill(m.rfqPage.rankedOn, { city: city(rfq.deliveryCity) })}
        </p>
        <ul>
          {shown.map((row) => (
            <SupplierCard key={row.supplierId} row={row} locked={!isDraft} checked={selected.has(row.supplierId)} onToggle={() => toggle(row.supplierId)} />
          ))}
        </ul>
        <details className="mt-4 border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-muted hover:text-ink">
            {fill(isDraft ? m.rfqPage.notShortlisted : m.rfqPage.notInvited, { n: rest.length })}
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
            {m.rfqPage.blind}
          </label>
          </div>
        ) : null}
      </Panel>

      {isDraft ? (
        <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/95 p-3 shadow-float backdrop-blur sm:bottom-4 sm:p-4">
          <p className="hidden text-sm text-ink-muted sm:block">
            {fill(isBlind ? m.rfqPage.selectedCountBlind : m.rfqPage.selectedCount, { selected: selected.size, total: shown.length })}
          </p>
          <button type="button" data-testid="shortlist-send" disabled={selected.size === 0} onClick={send} className={buttonClass("primary", "md", "w-full sm:w-auto")}>
            {selected.size === 1 ? m.rfqPage.sendOne : fill(m.rfqPage.send, { n: selected.size })}
          </button>
        </div>
      ) : (
        <p role="status" data-testid="shortlist-sent" className="rounded-xl bg-paper p-4 text-sm text-ink-muted">
          {fill(rfq.blindComparison ? m.rfqPage.sentBlind : m.rfqPage.sent, { n: rfq.invitedSupplierIds.length })}
        </p>
      )}
    </div>
  );
}
