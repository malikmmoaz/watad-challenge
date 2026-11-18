"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { Alert, Badge, Button, CellNote, CreditCapMeter, Facts, Icon, Panel, StatusTimeline, Table, Td, Th, THead, Tr, buttonClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { PO_STATUS } from "@/lib/status";
import { OfferComparisonTable } from "./offer-comparison-table";
import { reference } from "@/data";
import { add, formatSar } from "@/domain/money";
import type { Halalas, Offer, OfferId, PaymentMethod, PurchaseOrder, Rfq } from "@/domain/types";
import { blindLabels, compareOffers, suggestBasketSplit } from "@/lib/procurement/comparison";
import { PO_STEPS, creditEligibility, creditFit, placePurchaseOrders, quoteOrder, type PoOrder } from "@/lib/procurement/po";
import { getState, update, useDemo } from "@/store";


const supplierOf = (id: string) => reference.suppliers.find((s) => s.id === id);
const fmt = (n: number) => formatSar(n as Halalas);

export function OfferComparison({ rfq }: { rfq: Rfq }) {
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
  const nameOf = (o: Pick<Offer, "id" | "supplierId">) => (blind ? (labels.get(o.id) ?? "Supplier") : (supplierOf(o.supplierId)?.name ?? o.supplierId));

  // Always mounted, so screen readers announce the text when a PO is placed (#75).
  const live = (
    <p role="status" aria-live="polite" className="sr-only" data-testid="po-announcement">
      {placed ? `${placed.length > 1 ? `${placed.length} purchase orders issued` : "Purchase order issued"}: ${placed.map((p) => p.id).join(", ")}, total ${formatSar(add(...placed.map((p) => p.totalInclVat)))} including VAT.` : ""}
    </p>
  );
  if (placed)
    return (
      <>
        {live}
        <PoConfirmation pos={placed} />
      </>
    );
  if (offers.length === 0) {
    return (
      <Panel title="Offers">
        <p className="text-sm text-ink-muted">No offers (bids) yet. Invited suppliers see this RFQ in their inbox; offers appear here as they respond.</p>
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
        title={`Compare offers (bids) · ${offers.length}`}
        aside={
          !awarded && (
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" data-testid="offers-blind-toggle" checked={rfq.blindComparison} onChange={(e) => setBlind(e.target.checked)} />
              Blind: hide supplier names
            </label>
          )
        }
        flush
      >
        <p className="px-4 pt-3 text-sm text-ink-muted">
          Ranked on landed cost incl. delivery and 15% VAT (Made in Saudi offers get the 10% local-content preference in ranking only), coverage, lead time against your date, payment terms and supplier reliability. Prices are
          compared with the 90-day benchmark (sample data).
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
              return fit.status === "fits" ? { fits: true, text: "Fits your credit cap" } : { fits: false, text: `Over your credit cap by ${formatSar(fit.overBy)}` };
            }}
          />
        </div>
      </Panel>

      {split && !awarded && (
        <Alert
          tone="info"
          title={split.saving !== null ? `Split across ${split.allocations.length} suppliers to save ${formatSar(split.saving)}` : `No single offer covers every line: split across ${split.allocations.length} suppliers`}
          action={
            <Button size="sm" data-testid="offer-split-choose" onClick={() => setDraft(split.allocations.map((a) => ({ offerId: a.offerId, rfqLineIds: a.rfqLineIds })))}>
              Use this split
            </Button>
          }
        >
          {split.allocations.map((a) => {
            const o = offers.find((x) => x.id === a.offerId)!;
            const lines = a.rfqLineIds.map((id) => rfq.lines.find((l) => l.id === id)?.description ?? id).join(", ");
            return (
              <span key={a.offerId} className="block">
                {nameOf(o)}: {lines} · {formatSar(a.landedCostInclVat)} incl. delivery and VAT
              </span>
            );
          })}
          <span className="block">
            Total {formatSar(split.totalInclVat)}
            {split.bestSingleInclVat !== null ? ` vs ${formatSar(split.bestSingleInclVat)} from the best single offer` : ""}. Each supplier charges its own delivery, already included.
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
  const quotes = orders.flatMap((o) => {
    const offer = allOffers.find((x) => x.id === o.offerId);
    return offer ? [quoteOrder(rfq, offer, o.rfqLineIds)] : [];
  });
  const total = add(...quotes.map((q) => q.totalInclVat));
  const eligibility = creditEligibility(total, facility, quotes.flatMap((q) => reference.suppliers.filter((s) => s.id === q.offer.supplierId)));
  const [method, setMethod] = useState<PaymentMethod>(rfq.wantsCredit && eligibility.ok ? "platform_credit" : "bank_transfer");
  const [error, setError] = useState<string | null>(null);
  const useCredit = method === "platform_credit" && eligibility.ok;
  const markup = useCredit && facility ? Math.round(total * facility.profitRate) : 0;
  const tenor = facility?.maxTenorDays ?? 60;

  const place = () => {
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
    <Panel title={quotes.length > 1 ? `Draft purchase orders (${quotes.length})` : "Draft purchase order"} aside={<Button size="sm" variant="quiet" onClick={onCancel}>Cancel</Button>}>
      <div className="space-y-4" data-testid="po-draft">
        <ul className="space-y-2 text-sm">
          {quotes.map((q) => (
            <li key={q.offer.id} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2">
              <span>
                <span className="font-medium text-ink">{supplierOf(q.offer.supplierId)?.name ?? q.offer.supplierId}</span>
                <span className="block text-ink-muted">{q.rfqLineIds.map((id) => rfq.lines.find((l) => l.id === id)?.description ?? id).join(", ")}</span>
              </span>
              <span className="text-right tabular-nums">
                <span className="font-medium text-ink">{formatSar(q.totalInclVat)}</span>
                <span className="block text-ink-muted">
                  {formatSar(q.subtotal)} + {formatSar(q.deliveryFee)} delivery + {formatSar(q.vat)} VAT
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink">
          Total <strong className="tabular-nums" data-testid="po-draft-total">{formatSar(total)}</strong> incl. 15% VAT
        </p>

        <fieldset className="space-y-2 text-sm">
          <legend className="mb-1 font-medium text-ink">Payment</legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="pay" data-testid="po-pay-credit" disabled={!eligibility.ok} checked={useCredit} onChange={() => setMethod("platform_credit")} className="mt-1" />
            <span>
              Pay with credit: drawn from your credit cap, the supplier is paid directly
              {!eligibility.ok && <span className="block text-ink-muted">{eligibility.reason}</span>}
            </span>
          </label>
          {rfq.wantsCredit && !eligibility.ok && (
            <div data-testid="po-credit-blocked">
              <Alert tone="caution" title="Pay with credit is not available for this order">
                <span className="block">{eligibility.reason}</span>
                <span className="mt-1 block">You can:</span>
                <span className="block">· pay the supplier on its own terms by bank transfer (selected below);</span>
                {onUseSplit && (
                  <span className="block">
                    ·{" "}
                    <button type="button" className="underline" data-testid="po-blocked-split" onClick={onUseSplit}>
                      split the basket across suppliers
                    </button>{" "}
                    so a smaller order may fit;
                  </span>
                )}
                <span className="block">
                  ·{" "}
                  <Link href="/contractor/credit/apply" className="underline" data-testid="po-blocked-apply">
                    {facility ? "apply for a higher credit cap" : "apply for a credit cap"}
                  </Link>
                  .
                </span>
              </Alert>
            </div>
          )}
          <label className="flex items-start gap-2">
            <input type="radio" name="pay" data-testid="po-pay-bank" checked={!useCredit} onChange={() => setMethod("bank_transfer")} className="mt-1" />
            <span>Bank transfer to the supplier on its agreed terms</span>
          </label>
        </fieldset>

        {facility && (
          <div className="space-y-2">
            <CreditCapMeter cap={facility.cap} drawn={facility.drawn} thisPo={useCredit ? total : 0} format={fmt} />
            {useCredit && (
              <p className="text-sm text-ink-muted" data-testid="po-murabaha">
                Murabaha: {(facility.profitRate * 100).toFixed(1)}% profit rate for {tenor} days ({((facility.profitRate * 365 * 100) / tenor).toFixed(1)}% APR), markup {formatSar(markup as Halalas)}. You repay{" "}
                {formatSar((total + markup) as Halalas)} {tenor} days after delivery.
              </p>
            )}
          </div>
        )}

        {error && <Alert tone="negative" title="Could not place the purchase order">{error}</Alert>}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" data-testid="po-place" onClick={place}>
            {quotes.length > 1 ? `Place ${quotes.length} purchase orders` : "Place purchase order"}
          </Button>
          <span className="text-sm text-ink-muted">Choosing reveals the supplier name. Other offers are told they were not selected.</span>
        </div>
      </div>
    </Panel>
  );
}

const methodLabel = (po: PurchaseOrder) => (po.paymentMethod === "platform_credit" ? "Pay with credit (supplier paid directly from your credit cap)" : "Bank transfer");

function PoConfirmation({ pos }: { pos: PurchaseOrder[] }) {
  const total = add(...pos.map((p) => p.totalInclVat));
  const title = pos.length > 1 ? `${pos.length} purchase orders issued` : "Purchase order issued";
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
          {methodLabel(pos[0]!)}
        </p>
        <h2 ref={heading} tabIndex={-1} data-testid="po-confirmation-heading" className="mt-2 text-3xl font-semibold tracking-[var(--tracking-heading)] text-ink focus:outline-none">
          {title}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Total <span className="font-semibold tabular-nums text-ink">{formatSar(total)}</span> incl. 15% VAT
        </p>
      </section>
      {pos.map((po) => {
        const supplier = supplierOf(po.supplierId);
        return (
          <Panel key={po.id} title={supplier?.name ?? po.supplierId} aside={<Badge tone={PO_STATUS[po.status].tone}>{PO_STATUS[po.status].label}</Badge>}>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div>
                  <p className="text-xs text-ink-muted">PO number</p>
                  <p className="font-mono text-2xl font-semibold text-ink" data-testid="po-number">
                    {po.id}
                  </p>
                </div>
                <Facts
                  items={[
                    { label: "Total incl. 15% VAT", value: <span className="tabular-nums">{formatSar(po.totalInclVat)}</span> },
                    { label: "Expected on site", value: formatDate(po.expectedDelivery) },
                    {
                      label: "Payment",
                      value: po.creditDraw ? `Credit draw: repay ${formatSar(po.creditDraw.totalRepayable)} by ${formatDate(po.creditDraw.dueDate)}` : "Bank transfer on the supplier's terms",
                    },
                    { label: "Murabaha", value: po.creditDraw ? `Markup ${formatSar(po.creditDraw.markup)} (${(po.creditDraw.apr * 100).toFixed(1)}% APR)` : "Not used" },
                  ]}
                />
                <span className="sr-only" data-testid="po-status" data-status={po.status}>
                  {PO_STEPS[0]!.label}
                </span>
              </div>
              <div className="rounded-xl bg-paper p-4">
                <p className="mb-3 text-sm font-semibold text-ink">What happens next</p>
                <StatusTimeline
                  label={`Next steps for ${po.id}`}
                  steps={[
                    { label: "Issued", state: "done" },
                    { label: "Accepted by supplier", state: "current", note: `${supplier?.name ?? "The supplier"} accepts and confirms the delivery slot.` },
                    { label: "Dispatched to site", state: "upcoming" },
                  ]}
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">
              <Link href={`/contractor/po/${po.id}`} data-testid="po-timeline-link" className={buttonClass("primary")}>
                Follow the PO timeline
              </Link>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function PoList({ pos }: { pos: PurchaseOrder[] }) {
  return (
    <Panel title="Purchase orders" flush>
      <Table caption="Purchase orders for this RFQ" minWidth={560}>
        <THead>
          <tr>
            <Th>Purchase order</Th>
            <Th>Status</Th>
            <Th align="end">Total incl. VAT</Th>
          </tr>
        </THead>
        <tbody>
          {pos.map((po) => (
            <Tr key={po.id} data-testid="po-row">
              <Td>
                <Link href={`/contractor/po/${po.id}`} className="font-mono text-sm text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
                  {po.id}
                </Link>
                <CellNote>{supplierOf(po.supplierId)?.name}</CellNote>
              </Td>
              <Td>
                <Badge tone={PO_STATUS[po.status].tone}>{PO_STATUS[po.status].label}</Badge>
              </Td>
              <Td align="end">
                <span className="tabular-nums text-ink">{formatSar(po.totalInclVat)}</span>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Panel>
  );
}
