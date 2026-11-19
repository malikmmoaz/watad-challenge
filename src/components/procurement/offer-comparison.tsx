"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { Alert, Badge, Button, CellNote, CreditCapMeter, Facts, Icon, Panel, StatusTimeline, Table, Td, Th, THead, Tr, buttonClass } from "@/components/ui";
import { PO_STATUS } from "@/lib/status";
import { OfferComparisonTable } from "./offer-comparison-table";
import { reference } from "@/data";
import { add } from "@/domain/money";
import { useProcurementI18n } from "./use-procurement-i18n";
import type { Halalas, Offer, OfferId, PaymentMethod, PurchaseOrder, Rfq } from "@/domain/types";
import { blindLabels, compareOffers, suggestBasketSplit } from "@/lib/procurement/comparison";
import { creditEligibility, creditFit, placePurchaseOrders, quoteOrder, type PoOrder } from "@/lib/procurement/po";
import { getState, update, useDemo } from "@/store";


const supplierOf = (id: string) => reference.suppliers.find((s) => s.id === id);

export function OfferComparison({ rfq }: { rfq: Rfq }) {
  const i = useProcurementI18n();
  const c = i.m.comparison;
  const allOffers = useDemo((s) => s.offers);
  const allPos = useDemo((s) => s.purchaseOrders);
  const facilities = useDemo((s) => s.creditFacilities);
  const facility = facilities.find((f) => f.contractorId === rfq.contractorId) ?? null;
  const offers = useMemo(() => allOffers.filter((o) => o.rfqId === rfq.id && o.status !== "withdrawn"), [allOffers, rfq.id]);
  const pos = useMemo(() => allPos.filter((p) => p.rfqId === rfq.id), [allPos, rfq.id]);
  const [today] = useState(() => new Date().toISOString());
  const [draft, setDraft] = useState<PoOrder[] | null>(null);
  const [placed, setPlaced] = useState<PurchaseOrder[] | null>(null);

  const rows = useMemo(() => compareOffers(rfq, offers, { materials: reference.materials, suppliers: reference.suppliers, today }), [rfq, offers, today]);
  const split = useMemo(() => suggestBasketSplit(rfq, offers), [rfq, offers]);
  const labels = useMemo(() => blindLabels(offers), [offers]);
  const awarded = rfq.status === "awarded";
  const offerCount = offers.length;
  useEffect(() => {
    if (offerCount > 0 && !awarded) track("offers_compared", { rfq_id: rfq.id, offer_count: offerCount });
  }, [rfq.id, offerCount, awarded]);
  const ranks = useMemo(() => new Map(rows.map((r) => [r.offerId as string, r.rank])), [rows]);
  const awardedOffer = offers.find((o) => o.status === "awarded");
  const requiredInDays = Math.max(0, Math.ceil((Date.parse(rfq.requiredBy) - Date.parse(today)) / 86_400_000));
  const blind = rfq.blindComparison && !awarded;
  const nameOf = (o: Pick<Offer, "id" | "supplierId">) => (blind ? i.fill(c.blindLabel, { letters: (labels.get(o.id) ?? "Supplier").replace(/^Supplier /, "") }) : i.name(supplierOf(o.supplierId), o.supplierId));

  // Always mounted, so screen readers announce the text when a PO is placed (#75).
  const live = (
    <p role="status" aria-live="polite" className="sr-only" data-testid="po-announcement">
      {placed
        ? i.fill(i.m.poIssued.announce, {
            title: placed.length > 1 ? i.fill(i.m.poIssued.many, { n: placed.length }) : i.m.poIssued.one,
            ids: placed.map((p) => p.id).join(", "),
            total: i.f.money(add(...placed.map((p) => p.totalInclVat))),
          })
        : ""}
    </p>
  );
  if (placed)
    return (
      <>
        {live}
        <PoConfirmation pos={placed} wantedCredit={rfq.wantsCredit} />
      </>
    );
  if (offers.length === 0) {
    return (
      <Panel title={c.emptyTitle}>
        <p className="text-sm text-ink-muted">{c.empty}</p>
      </Panel>
    );
  }

  const setBlind = (on: boolean) => update((prev) => ({ ...prev, rfqs: prev.rfqs.map((r) => (r.id === rfq.id ? { ...r, blindComparison: on } : r)) }));

  return (
    <>
      {live}
    <div className="space-y-4">
      {awarded && pos.length > 0 && <PoList pos={pos} />}
      <Panel
        title={i.fill(c.title, { n: offers.length })}
        aside={
          !awarded && (
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" data-testid="offers-blind-toggle" checked={rfq.blindComparison} onChange={(e) => setBlind(e.target.checked)} />
              {c.blindToggle}
            </label>
          )
        }
        flush
      >
        <p className="px-4 pt-3 text-sm text-ink-muted">
          {c.explainer}
        </p>
        <div className="mt-2">
          <OfferComparisonTable
            rows={rows}
            nameOf={(r) => nameOf(offers.find((o) => o.id === r.offerId)!)}
            requiredInDays={requiredInDays}
            rfqLabel={rfq.id}
            {...(awardedOffer ? { chosenOfferId: awardedOffer.id } : {})}
            {...(awarded ? {} : { onChoose: (offerId: OfferId) => setDraft([{ offerId }]) })}
            acceptsCredit={(r) => supplierOf(r.supplierId)?.acceptsPlatformCredit ?? false}
            creditFit={(r) => {
              if (!supplierOf(r.supplierId)?.acceptsPlatformCredit) return null;
              const fit = creditFit(r.landedCostInclVat, facility);
              if (fit.status === "no_cap") return null;
              return fit.status === "fits" ? { fits: true, text: c.fitsCap } : { fits: false, text: i.fill(c.overCap, { amount: i.f.money(fit.overBy) }) };
            }}
          />
        </div>
      </Panel>

      {split && !awarded && (
        <Alert
          tone="info"
          title={split.saving !== null ? i.fill(c.split.save, { n: split.allocations.length, saving: i.f.money(split.saving) }) : i.fill(c.split.noSingle, { n: split.allocations.length })}
          action={
            <Button size="sm" data-testid="offer-split-choose" onClick={() => setDraft(split.allocations.map((a) => ({ offerId: a.offerId, rfqLineIds: a.rfqLineIds })))}>
              {c.split.use}
            </Button>
          }
        >
          {split.allocations.map((a) => {
            const o = offers.find((x) => x.id === a.offerId)!;
            const lines = a.rfqLineIds.map((id) => (() => { const l = rfq.lines.find((x) => x.id === id); const mat = l ? reference.materials.find((x) => x.id === l.materialId) : undefined; return l ? (mat && l.description === mat.name ? i.name(mat) : l.description) : id; })()).join(i.ar ? "، " : ", ");
            return (
              <span key={a.offerId} className="block">
                {i.fill(c.split.allocation, { supplier: nameOf(o), lines, total: i.f.money(a.landedCostInclVat) })}
              </span>
            );
          })}
          <span className="block">
            {split.bestSingleInclVat !== null
              ? i.fill(c.split.totalVsSingle, { total: i.f.money(split.totalInclVat), single: i.f.money(split.bestSingleInclVat) })
              : i.fill(c.split.total, { total: i.f.money(split.totalInclVat) })}
          </span>
        </Alert>
      )}

      {draft && !awarded && <PoDraft rfq={rfq} orders={draft} ranks={ranks} {...(split && draft.length === 1 ? { onUseSplit: () => setDraft(split.allocations.map((a) => ({ offerId: a.offerId, rfqLineIds: a.rfqLineIds }))) } : {})} onCancel={() => setDraft(null)} onPlaced={setPlaced} />}
    </div>
    </>
  );
}

function PoDraft({ rfq, orders, ranks, onUseSplit, onCancel, onPlaced }: { rfq: Rfq; orders: PoOrder[]; ranks: Map<string, number>; onUseSplit?: () => void; onCancel: () => void; onPlaced: (pos: PurchaseOrder[]) => void }) {
  const allOffers = useDemo((s) => s.offers);
  const facilities = useDemo((s) => s.creditFacilities);
  const facility = facilities.find((f) => f.contractorId === rfq.contractorId) ?? null;
  const i = useProcurementI18n();
  const d = i.m.poDraft;
  const quotes = orders.flatMap((o) => {
    const offer = allOffers.find((x) => x.id === o.offerId);
    return offer ? [quoteOrder(rfq, offer, o.rfqLineIds)] : [];
  });
  const total = add(...quotes.map((q) => q.totalInclVat));
  const eligibility = creditEligibility(total, facility, quotes.flatMap((q) => reference.suppliers.filter((s) => s.id === q.offer.supplierId)));
  // Never switch to bank transfer silently: if credit was the plan (or was selected) and this order
  // cannot use it, nothing is selected until the contractor picks bank transfer, and the alert says why.
  const [method, setMethod] = useState<PaymentMethod>(rfq.wantsCredit ? "platform_credit" : "bank_transfer");
  const [error, setError] = useState<string | null>(null);
  const useCredit = method === "platform_credit" && eligibility.ok;
  const blocked = method === "platform_credit" && !eligibility.ok;
  const showAlert = !eligibility.ok && (rfq.wantsCredit || facility !== null);
  const markup = useCredit && facility ? Math.round(total * facility.profitRate) : 0;
  const tenor = facility?.maxTenorDays ?? 60;
  const chooseId = useId();

  const place = () => {
    if (blocked) return;
    // Read the cap before this order is drawn, so the funnel records whether it fitted.
    const before = getState();
    const fit = creditFit(total, before.creditFacilities.find((f) => f.contractorId === rfq.contractorId) ?? null);
    const withinCap = fit.status === "no_cap" ? null : fit.status === "fits";
    const r = placePurchaseOrders(before, { rfqId: rfq.id, orders, method: useCredit ? "platform_credit" : "bank_transfer", suppliers: reference.suppliers, now: new Date().toISOString() });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    update(() => r.state);
    for (const po of r.pos) {
      track("offer_awarded", { rfq_id: rfq.id, offer_id: po.offerId, rank: ranks.get(po.offerId) ?? 0 });
      track("po_placed", { po_id: po.id, payment_method: po.paymentMethod, within_credit_cap: withinCap });
    }
    onPlaced(r.pos);
  };

  return (
    <Panel title={quotes.length > 1 ? i.fill(d.many, { n: quotes.length }) : d.one} aside={<Button size="sm" variant="quiet" onClick={onCancel}>{i.m.common.cancel}</Button>}>
      <div className="space-y-4" data-testid="po-draft">
        <ul className="space-y-2 text-sm">
          {quotes.map((q) => (
            <li key={q.offer.id} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2">
              <span>
                <span className="font-medium text-ink">{i.name(supplierOf(q.offer.supplierId), q.offer.supplierId)}</span>
                <span className="block text-ink-muted">{q.rfqLineIds.map((id) => (() => { const l = rfq.lines.find((x) => x.id === id); const mat = l ? reference.materials.find((x) => x.id === l.materialId) : undefined; return l ? (mat && l.description === mat.name ? i.name(mat) : l.description) : id; })()).join(i.ar ? "، " : ", ")}</span>
              </span>
              <span className="text-right tabular-nums">
                <span className="font-medium text-ink">{i.f.money(q.totalInclVat)}</span>
                <span className="block text-ink-muted">
                  {i.fill(d.breakdown, { goods: i.f.money(q.subtotal), delivery: i.f.money(q.deliveryFee), vat: i.f.money(q.vat) })}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink">
          {d.total.split("{total}")[0]}
          <strong className="tabular-nums" data-testid="po-draft-total">{i.f.money(total)}</strong>
          {d.total.split("{total}")[1]}
        </p>

        <fieldset className="space-y-2 text-sm">
          <legend className="mb-1 font-medium text-ink">{d.payment}</legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="pay" data-testid="po-pay-credit" disabled={!eligibility.ok} checked={useCredit} onChange={() => setMethod("platform_credit")} className="mt-1" />
            <span>
              {d.payCredit}
              {!eligibility.ok && !showAlert && <span className="block text-ink-muted">{i.logic("poErrors", eligibility.reason)}</span>}
            </span>
          </label>
          {showAlert && (
            <div data-testid="po-credit-blocked">
              <Alert tone="caution" title={d.blockedTitle}>
                <span className="block">{i.logic("poErrors", eligibility.reason)}</span>
                <span className="mt-1 block">{d.youCan}</span>
                <span className="block">· {d.altBank}</span>
                {/* A split or a higher cap only helps when the order is too big for the cap. */}
                {onUseSplit && !eligibility.ok && eligibility.kind === "over_cap" && (
                  <span className="block">
                    ·{" "}
                    <button type="button" className="underline" data-testid="po-blocked-split" onClick={onUseSplit}>
                      {d.altSplit}
                    </button>{" "}
                    {d.altSplitTail}
                  </span>
                )}
                {!eligibility.ok && eligibility.kind !== "supplier_refuses" && (
                  <span className="block">
                    ·{" "}
                    <Link href="/contractor/credit/apply" className="underline" data-testid="po-blocked-apply">
                      {eligibility.kind === "over_cap" ? d.altApplyHigher : d.altApply}
                    </Link>
                    .
                  </span>
                )}
              </Alert>
            </div>
          )}
          <label className="flex items-start gap-2">
            <input type="radio" name="pay" data-testid="po-pay-bank" checked={method === "bank_transfer"} onChange={() => setMethod("bank_transfer")} className="mt-1" />
            <span>{d.payBank}</span>
          </label>
        </fieldset>

        {facility && (
          <div className="space-y-2">
            <CreditCapMeter cap={facility.cap} drawn={facility.drawn} thisPo={useCredit ? total : 0} format={(n) => i.f.money(n as Halalas)} />
            {useCredit && (
              <p className="text-sm text-ink-muted" data-testid="po-murabaha">
                {i.fill(d.murabaha, {
                  rate: i.f.percent(facility.profitRate, 1),
                  days: tenor,
                  apr: i.f.percent((facility.profitRate * 365) / tenor, 1),
                  markup: i.f.money(markup as Halalas),
                  repay: i.f.money((total + markup) as Halalas),
                })}
              </p>
            )}
          </div>
        )}

        {error && <Alert tone="negative" title={d.error}>{i.logic("poErrors", error)}</Alert>}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" data-testid="po-place" onClick={place} disabled={blocked} aria-describedby={blocked ? chooseId : undefined}>
            {quotes.length > 1 ? i.fill(d.placeMany, { n: quotes.length }) : d.placeOne}
          </Button>
          {blocked ? (
            <span id={chooseId} className="text-sm font-medium text-caution" data-testid="po-choose-method">
              {d.chooseMethod}
            </span>
          ) : (
            <span className="text-sm text-ink-muted">{d.reveal}</span>
          )}
        </div>
      </div>
    </Panel>
  );
}


function PoConfirmation({ pos, wantedCredit }: { pos: PurchaseOrder[]; wantedCredit: boolean }) {
  const total = add(...pos.map((p) => p.totalInclVat));
  const i = useProcurementI18n();
  const x = i.m.poIssued;
  const title = pos.length > 1 ? i.fill(x.many, { n: pos.length }) : x.one;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // The button that placed the PO is gone: move focus to the result so keyboard
    // users land on it instead of <body> (#75). The parent's live region announces it.
    heading.current?.focus();
  }, []);
  return (
    <div data-testid="po-confirmation" className="space-y-4 motion-safe:animate-rise">
      <section className="rounded-[22px] bg-positive-soft p-6 shadow-card sm:p-8">
        <p className="flex items-center gap-2 text-sm font-medium text-positive">
          <Icon name="check" size={16} strokeWidth={2.25} />
          {pos[0]!.paymentMethod === "platform_credit" ? x.methodCredit : x.methodBank}
        </p>
        <h2 ref={heading} tabIndex={-1} data-testid="po-confirmation-heading" className="mt-2 text-3xl font-semibold tracking-[var(--tracking-heading)] text-ink focus:outline-none">
          {title}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {x.total.split("{total}")[0]}
          <span className="font-semibold tabular-nums text-ink">{i.f.money(total)}</span>
          {x.total.split("{total}")[1]}
        </p>
      </section>
      {pos.map((po) => {
        const supplier = supplierOf(po.supplierId);
        return (
          <Panel key={po.id} title={i.name(supplier, po.supplierId)} aside={<Badge tone={PO_STATUS[po.status].tone}>{i.status.po[po.status]}</Badge>}>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div>
                  <p className="text-xs text-ink-muted">{x.poNumber}</p>
                  <p className="font-mono text-2xl font-semibold text-ink" data-testid="po-number">
                    {po.id}
                  </p>
                </div>
                <Facts
                  items={[
                    { label: i.m.common.totalInclVat, value: <span className="tabular-nums">{i.f.money(po.totalInclVat)}</span> },
                    { label: x.expectedOnSite, value: i.f.date(po.expectedDelivery) },
                    {
                      label: i.m.common.payment,
                      value: po.creditDraw ? i.fill(x.creditDraw, { repay: i.f.money(po.creditDraw.totalRepayable), due: i.f.date(po.creditDraw.dueDate) }) : x.bankOnTerms,
                    },
                    { label: x.murabaha, value: po.creditDraw ? i.fill(x.markup, { markup: i.f.money(po.creditDraw.markup), apr: i.f.percent(po.creditDraw.apr, 1) }) : wantedCredit ? x.notUsedWhy : x.notUsed },
                  ]}
                />
                <span className="sr-only" data-testid="po-status" data-status={po.status}>
                  {i.m.poSteps.placed.label}
                </span>
              </div>
              <div className="rounded-xl bg-paper p-4">
                <p className="mb-3 text-sm font-semibold text-ink">{x.whatNext}</p>
                <StatusTimeline
                  label={i.fill(x.nextFor, { po: po.id })}
                  steps={[
                    { label: x.issued, state: "done" },
                    { label: x.acceptedBySupplier, state: "current", note: i.fill(x.supplierAccepts, { supplier: i.name(supplier, x.theSupplier) }) },
                    { label: x.dispatchedToSite, state: "upcoming" },
                  ]}
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">
              <Link href={`/contractor/po/${po.id}`} data-testid="po-timeline-link" className={buttonClass("primary")}>
                {x.follow}
              </Link>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function PoList({ pos }: { pos: PurchaseOrder[] }) {
  const i = useProcurementI18n();
  return (
    <Panel title={i.m.poList.title} flush>
      <Table caption={i.m.poList.caption} minWidth={560}>
        <THead>
          <tr>
            <Th>{i.m.poList.po}</Th>
            <Th>{i.m.common.status}</Th>
            <Th align="end">{i.m.common.totalInclVatShort}</Th>
          </tr>
        </THead>
        <tbody>
          {pos.map((po) => (
            <Tr key={po.id} data-testid="po-row">
              <Td>
                <Link href={`/contractor/po/${po.id}`} className="font-mono text-sm text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
                  {po.id}
                </Link>
                <CellNote>{i.name(supplierOf(po.supplierId))}</CellNote>
              </Td>
              <Td>
                <Badge tone={PO_STATUS[po.status].tone}>{i.status.po[po.status]}</Badge>
              </Td>
              <Td align="end">
                <span className="tabular-nums text-ink">{i.f.money(po.totalInclVat)}</span>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Panel>
  );
}
