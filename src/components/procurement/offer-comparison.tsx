"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { Alert, Badge, Button, CellNote, CreditCapMeter, FactorBar, Panel, Table, THead, Td, Th, Tr, type Tone } from "@/components/ui";
import { reference } from "@/data";
import { add, formatSar } from "@/domain/money";
import type { ComparisonFactor, Halalas, Offer, PaymentMethod, PurchaseOrder, Rfq } from "@/domain/types";
import { blindLabels, compareOffers, suggestBasketSplit, type OfferBadge, type OfferComparisonRow } from "@/lib/procurement/comparison";
import { PO_STEPS, creditEligibility, placePurchaseOrders, quoteOrder, type PoOrder } from "@/lib/procurement/po";
import { getState, update, useDemo } from "@/store";

const BADGES: Record<OfferBadge, string> = {
  lowest_landed_cost: "Lowest landed cost",
  fastest: "Fastest",
  best_terms: "Best terms",
  most_reliable: "Most reliable",
};
const FACTORS: Record<ComparisonFactor, string> = {
  cost: "Landed cost",
  coverage: "Coverage",
  lead_time: "Lead time",
  reliability: "Reliability",
  payment_terms: "Payment terms",
  local_content: "Local content",
};
const FLAG: Record<OfferComparisonRow["priceFlag"], { tone: Tone; text: (pct: number) => string }> = {
  below_market: { tone: "positive", text: (p) => `${Math.abs(p)}% below benchmark` },
  in_line: { tone: "neutral", text: () => "In line with benchmark" },
  above_market: { tone: "caution", text: (p) => `${p}% above benchmark` },
};

const supplierOf = (id: string) => reference.suppliers.find((s) => s.id === id);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const fmt = (n: number) => formatSar(n as Halalas);

export function OfferComparison({ rfq }: { rfq: Rfq }) {
  const allOffers = useDemo((s) => s.offers);
  const allPos = useDemo((s) => s.purchaseOrders);
  const offers = useMemo(() => allOffers.filter((o) => o.rfqId === rfq.id && o.status !== "withdrawn"), [allOffers, rfq.id]);
  const pos = useMemo(() => allPos.filter((p) => p.rfqId === rfq.id), [allPos, rfq.id]);
  const [today] = useState(() => new Date().toISOString());
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<PoOrder[] | null>(null);
  const [placed, setPlaced] = useState<PurchaseOrder[] | null>(null);

  const rows = useMemo(() => compareOffers(rfq, offers, { materials: reference.materials, suppliers: reference.suppliers, today }), [rfq, offers, today]);
  const split = useMemo(() => suggestBasketSplit(rfq, offers), [rfq, offers]);
  const labels = useMemo(() => blindLabels(offers), [offers]);
  const awarded = rfq.status === "awarded";
  const blind = rfq.blindComparison && !awarded;
  const nameOf = (o: Pick<Offer, "id" | "supplierId">) => (blind ? (labels.get(o.id) ?? "Supplier") : (supplierOf(o.supplierId)?.name ?? o.supplierId));

  if (placed) return <PoConfirmation pos={placed} />;
  if (offers.length === 0) {
    return (
      <Panel title="Offers">
        <p className="text-sm text-ink-muted">No offers (bids) yet. Invited suppliers see this RFQ in their inbox; offers appear here as they respond.</p>
      </Panel>
    );
  }

  const setBlind = (on: boolean) => update((prev) => ({ ...prev, rfqs: prev.rfqs.map((r) => (r.id === rfq.id ? { ...r, blindComparison: on } : r)) }));

  return (
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
        <Table caption="Offers for this RFQ, best first" minWidth={900} className="mt-2">
          <THead>
            <tr>
            <Th>Supplier</Th>
            <Th align="end">Landed cost incl. VAT</Th>
            <Th>Price vs benchmark</Th>
            <Th>Covers</Th>
            <Th>Lead time</Th>
            <Th>Terms</Th>
            <Th>Reliability</Th>
            <Th align="end">Score</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
            </tr>
          </THead>
          <tbody>
            {rows.map((r) => {
              const offer = offers.find((o) => o.id === r.offerId)!;
              const supplier = supplierOf(r.supplierId);
              const flag = FLAG[r.priceFlag];
              const isOpen = open === r.offerId;
              return (
                <Fragment key={r.offerId}>
                  <Tr data-testid="offer-row" data-offer={r.offerId} state={offer.status === "awarded" ? "selected" : offer.status === "not_selected" ? "muted" : r.rank === 1 && !awarded ? "recommended" : "default"}>
                    <Td>
                      <span className="font-medium text-ink" data-testid="offer-supplier">{nameOf(offer)}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.badges.map((b) => (
                          <Badge key={b} tone="positive">{BADGES[b]}</Badge>
                        ))}
                        {r.localContent && <Badge tone="info" icon={false}>Made in Saudi</Badge>}
                        {offer.status === "awarded" && <Badge tone="positive">Awarded</Badge>}
                      </div>
                    </Td>
                    <Td align="end">
                      <span className="font-medium tabular-nums text-ink" data-testid="offer-landed">{formatSar(r.landedCostInclVat)}</span>
                      <CellNote>
                        <span className="block">Goods {formatSar(r.subtotal)}</span>
                        <span className="block">Delivery {formatSar(r.deliveryFee)}</span>
                        <span className="block">VAT {formatSar(r.vat)}</span>
                      </CellNote>
                    </Td>
                    <Td>
                      <Badge tone={flag.tone}>{flag.text(r.vsBenchmarkPct)}</Badge>
                    </Td>
                    <Td>
                      {r.linesCovered === r.linesRequested ? "All lines" : <span className="text-caution">{r.linesCovered} of {r.linesRequested} lines</span>}
                      <CellNote>{pct(r.coverage)} of value</CellNote>
                    </Td>
                    <Td>
                      {r.leadTimeDays} days
                      <CellNote>{r.meetsRequiredBy ? "In time" : <span className="text-negative">Late for your date</span>}</CellNote>
                    </Td>
                    <Td>
                      {r.termsLabel.replace(" (supplier paid directly)", "")}
                      <CellNote>{supplier?.acceptsPlatformCredit ? "Takes credit cap" : "No platform credit"}</CellNote>
                    </Td>
                    <Td>
                      {supplier && supplier.performance.ordersCompleted >= 5 ? `${pct(supplier.performance.onTimeRate)} on time` : "New supplier"}
                      <CellNote>{supplier ? `${supplier.performance.ordersCompleted} orders` : ""}</CellNote>
                    </Td>
                    <Td align="end">
                      <button type="button" className="font-semibold tabular-nums text-ink underline decoration-dotted underline-offset-4" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.offerId)} data-testid="offer-score">
                        {r.score}
                      </button>
                      <CellNote>#{r.rank}</CellNote>
                    </Td>
                    <Td>
                      {!awarded && (
                        <Button size="sm" variant={r.rank === 1 ? "primary" : "secondary"} data-testid="offer-choose" onClick={() => setDraft([{ offerId: offer.id }])}>
                          Choose
                        </Button>
                      )}
                    </Td>
                  </Tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={9} className="border-b border-line bg-paper px-4 py-3">
                        <p className="mb-2 text-sm font-medium text-ink">Why this score</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {r.scoreBreakdown.map((f) => (
                            <FactorBar key={f.factor} label={FACTORS[f.factor]} points={f.points} weight={f.weight} note={f.note} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
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

      {draft && !awarded && <PoDraft rfq={rfq} orders={draft} onCancel={() => setDraft(null)} onPlaced={setPlaced} />}
    </div>
  );
}

function PoDraft({ rfq, orders, onCancel, onPlaced }: { rfq: Rfq; orders: PoOrder[]; onCancel: () => void; onPlaced: (pos: PurchaseOrder[]) => void }) {
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
    const r = placePurchaseOrders(getState(), { rfqId: rfq.id, orders, method: useCredit ? "platform_credit" : "bank_transfer", suppliers: reference.suppliers, now: new Date().toISOString() });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    update(() => r.state);
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
                Murabaha: markup {(facility.profitRate * 100).toFixed(1)}% flat for {tenor} days = {formatSar(markup as Halalas)} (APR {((facility.profitRate * 365 * 100) / tenor).toFixed(1)}%). You repay{" "}
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
  return (
    <div data-testid="po-confirmation" className="space-y-4">
      <Alert tone="positive" title={pos.length > 1 ? `${pos.length} purchase orders issued` : "Purchase order issued"}>
        Total {formatSar(total)} incl. 15% VAT · {methodLabel(pos[0]!)}
      </Alert>
      {pos.map((po) => {
        const supplier = supplierOf(po.supplierId);
        return (
          <Panel key={po.id} title={`PO ${po.id}`}>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-muted">PO number</dt>
                <dd className="font-mono text-ink" data-testid="po-number">{po.id}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Supplier</dt>
                <dd className="text-ink">{supplier?.name ?? po.supplierId}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Total incl. 15% VAT</dt>
                <dd className="tabular-nums text-ink">{formatSar(po.totalInclVat)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Payment</dt>
                <dd className="text-ink">
                  {methodLabel(po)}
                  {po.creditDraw && (
                    <span className="block text-ink-muted">
                      Repay {formatSar(po.creditDraw.totalRepayable)} by {po.creditDraw.dueDate} (markup {formatSar(po.creditDraw.markup)}, APR {(po.creditDraw.apr * 100).toFixed(1)}%)
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Status</dt>
                <dd className="text-ink" data-testid="po-status" data-status={po.status}>
                  {PO_STEPS[0]!.label}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">What happens next</dt>
                <dd className="text-ink">
                  {supplier?.name ?? "The supplier"} accepts the PO and confirms the delivery slot, then dispatches to site (expected {po.expectedDelivery}).
                </dd>
              </div>
            </dl>
            <Link href={`/contractor/po/${po.id}`} data-testid="po-timeline-link" className="mt-3 inline-block text-sm font-medium text-ink underline">
              Follow the PO timeline
            </Link>
          </Panel>
        );
      })}
    </div>
  );
}

function PoList({ pos }: { pos: PurchaseOrder[] }) {
  return (
    <Panel title="Purchase orders">
      <ul className="space-y-1 text-sm">
        {pos.map((po) => (
          <li key={po.id} data-testid="po-row" className="flex flex-wrap justify-between gap-2">
            <Link href={`/contractor/po/${po.id}`} className="font-mono text-ink underline">{po.id}</Link>
            <span className="text-ink-muted">
              {supplierOf(po.supplierId)?.name} · {formatSar(po.totalInclVat)} · {PO_STEPS.find((s) => s.status === po.status)?.label ?? po.status}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
