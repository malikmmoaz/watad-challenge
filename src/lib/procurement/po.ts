/**
 * Purchase orders (pure): place one PO per supplier from a chosen offer or a
 * basket split, optionally paid from the contractor's credit cap, and move a
 * PO along its status timeline. Every function returns new state.
 */
import type { DemoState } from "@/data";
import { add, formatSar, halalas, murabaha, vatOn } from "@/domain/money";
import type { CreditFacility, Halalas, Offer, OfferId, PaymentMethod, PoId, PoStatus, PurchaseOrder, Rfq, Supplier } from "@/domain/types";

const DAY_MS = 86_400_000;

/** The PO timeline as the contractor reads it. */
export const PO_STEPS: { status: PoStatus; label: string; next: string }[] = [
  { status: "placed", label: "Issued", next: "The supplier accepts the PO and confirms the delivery slot." },
  { status: "confirmed", label: "Accepted by supplier", next: "The supplier dispatches the materials to site." },
  { status: "dispatched", label: "Dispatched", next: "You confirm delivery on site." },
  { status: "delivered", label: "Delivered", next: "The supplier issues its ZATCA e-invoice." },
  { status: "invoiced", label: "Invoiced", next: "The invoice is paid." },
  { status: "paid", label: "Paid", next: "Nothing further: the order is closed." },
];

export const stepIndex = (s: PoStatus): number => PO_STEPS.findIndex((x) => x.status === s);

export interface PoOrder {
  offerId: OfferId;
  /** RFQ lines this PO covers; all lines the offer supplies in full when omitted. */
  rfqLineIds?: string[];
}

export interface PoQuote {
  offer: Offer;
  rfqLineIds: string[];
  subtotal: Halalas;
  deliveryFee: Halalas;
  vat: Halalas;
  totalInclVat: Halalas;
}

/** Prices the lines of an offer that a PO would cover: goods + delivery, then 15% VAT. */
export function quoteOrder(rfq: Rfq, offer: Offer, rfqLineIds?: string[]): PoQuote {
  const qty = new Map(rfq.lines.map((l) => [l.id, l.quantity]));
  const lines = offer.lines.filter((ol) => (rfqLineIds ? rfqLineIds.includes(ol.rfqLineId) : (qty.get(ol.rfqLineId) ?? Infinity) <= ol.quantityAvailable));
  const subtotal = halalas(lines.reduce((sum, ol) => sum + ol.unitPrice * Math.min(ol.quantityAvailable, qty.get(ol.rfqLineId) ?? 0), 0));
  const vat = vatOn(add(subtotal, offer.deliveryFee));
  return { offer, rfqLineIds: lines.map((l) => l.rfqLineId), subtotal, deliveryFee: offer.deliveryFee, vat, totalInclVat: add(subtotal, offer.deliveryFee, vat) };
}

/**
 * What is left of the credit cap: always cap minus drawn. The stored
 * `available` field is a cache that can go stale, so procurement never
 * reads it; every check and every screen goes through this one function.
 */
export const availableCredit = (facility: Pick<CreditFacility, "cap" | "drawn">): Halalas => halalas(Math.max(0, facility.cap - facility.drawn));

export type CreditEligibility = { ok: true; tenorDays: CreditFacility["maxTenorDays"] } | { ok: false; reason: string };

/** Whether these orders can be paid from the credit cap, and if not, why. */
export function creditEligibility(total: Halalas, facility: CreditFacility | null, suppliers: Supplier[]): CreditEligibility {
  if (!facility) return { ok: false, reason: "You have no approved credit cap yet." };
  const refusing = suppliers.filter((s) => !s.acceptsPlatformCredit);
  if (refusing.length > 0) return { ok: false, reason: `${refusing.map((s) => s.name).join(", ")} does not accept platform credit.` };
  const available = availableCredit(facility);
  if (total > available) {
    return { ok: false, reason: `This order is ${formatSar(halalas(total - available))} above what is left of your credit cap (${formatSar(available)} of ${formatSar(facility.cap)}).` };
  }
  return { ok: true, tenorDays: facility.maxTenorDays };
}

export interface PlaceArgs {
  rfqId: string;
  orders: PoOrder[];
  method: PaymentMethod;
  suppliers: Supplier[];
  /** ISO timestamp; passed in to keep the function pure. */
  now: string;
}

export type PlaceResult = { ok: true; state: DemoState; pos: PurchaseOrder[] } | { ok: false; error: string };

/**
 * Places one PO per order. With `platform_credit` the whole amount is drawn
 * from the cap as a Murabaha sale (flat markup for the tenor, APR shown) and
 * the supplier is paid directly by the financier, never by the contractor.
 * The RFQ is marked awarded; chosen offers awarded, the rest not selected.
 */
export function placePurchaseOrders(state: DemoState, args: PlaceArgs): PlaceResult {
  const rfq = state.rfqs.find((r) => r.id === args.rfqId);
  if (!rfq) return { ok: false, error: "RFQ not found." };
  if (rfq.status === "awarded") return { ok: false, error: "This RFQ has already been awarded." };
  if (args.orders.length === 0) return { ok: false, error: "Choose at least one offer." };

  const quotes: PoQuote[] = [];
  for (const o of args.orders) {
    const offer = state.offers.find((x) => x.id === o.offerId && x.rfqId === rfq.id);
    if (!offer) return { ok: false, error: "Offer not found for this RFQ." };
    const q = quoteOrder(rfq, offer, o.rfqLineIds);
    if (q.rfqLineIds.length === 0) return { ok: false, error: "The chosen offer covers none of the lines." };
    quotes.push(q);
  }
  const covered = quotes.flatMap((q) => q.rfqLineIds);
  if (new Set(covered).size !== covered.length) return { ok: false, error: "A line is ordered from two suppliers." };

  const total = add(...quotes.map((q) => q.totalInclVat));
  const facility = state.creditFacilities.find((f) => f.contractorId === rfq.contractorId) ?? null;
  const suppliersUsed = quotes.flatMap((q) => args.suppliers.filter((s) => s.id === q.offer.supplierId));
  let tenorDays: CreditFacility["maxTenorDays"] = 60;
  if (args.method === "platform_credit") {
    const e = creditEligibility(total, facility, suppliersUsed);
    if (!e.ok) return { ok: false, error: e.reason };
    tenorDays = e.tenorDays;
  }

  const stamp = Date.parse(args.now);
  const pos: PurchaseOrder[] = quotes.map((q, i) => {
    const id = `po_${stamp.toString(36)}${quotes.length > 1 ? `_${i + 1}` : ""}` as PoId;
    const offset = Math.max(1, q.offer.leadTimeDays);
    const po: PurchaseOrder = {
      id,
      rfqId: rfq.id,
      offerId: q.offer.id,
      contractorId: rfq.contractorId,
      supplierId: q.offer.supplierId,
      status: "placed",
      timeline: [{ status: "placed", at: args.now, actor: "contractor", ...(quotes.length > 1 ? { note: `Part ${i + 1} of ${quotes.length} of a split order` } : {}) }],
      subtotal: q.subtotal,
      deliveryFee: q.deliveryFee,
      vat: q.vat,
      totalInclVat: q.totalInclVat,
      paymentMethod: args.method,
      expectedDelivery: new Date(stamp + offset * DAY_MS).toISOString().slice(0, 10),
      placedAt: args.now,
    };
    if (args.method === "platform_credit" && facility) {
      const m = murabaha(q.totalInclVat, facility.profitRate, tenorDays);
      po.creditDraw = {
        poId: id,
        creditCaseId: facility.creditCaseId,
        principal: q.totalInclVat,
        tenorDays,
        profitRate: facility.profitRate,
        markup: m.markup,
        apr: m.apr,
        totalRepayable: m.totalRepayable,
        dueDate: new Date(stamp + (offset + tenorDays) * DAY_MS).toISOString().slice(0, 10),
      };
    }
    return po;
  });

  const awarded = new Set<string>(quotes.map((q) => q.offer.id));
  return {
    ok: true,
    pos,
    state: {
      ...state,
      rfqs: state.rfqs.map((r) => (r.id === rfq.id ? { ...r, status: "awarded" } : r)),
      offers: state.offers.map((o) =>
        o.rfqId !== rfq.id || o.status !== "submitted" ? o : { ...o, status: awarded.has(o.id) ? "awarded" : "not_selected" },
      ),
      purchaseOrders: [...pos, ...state.purchaseOrders],
      creditFacilities:
        args.method === "platform_credit" && facility
          ? state.creditFacilities.map((f) => (f === facility ? { ...f, drawn: add(f.drawn, total), available: availableCredit({ cap: f.cap, drawn: add(f.drawn, total) }) } : f))
          : state.creditFacilities,
    },
  };
}

/**
 * Moves a PO one step along its timeline. For a credit PO, payment on the
 * invoice is made by the financier straight to the supplier.
 */
export function advancePurchaseOrder(po: PurchaseOrder, now: string, note?: string): PurchaseOrder {
  const i = stepIndex(po.status);
  const next = i >= 0 ? PO_STEPS[i + 1] : undefined;
  if (!next) return po;
  const actor = next.status === "confirmed" || next.status === "dispatched" || next.status === "invoiced" ? "supplier" : next.status === "delivered" ? "contractor" : "platform";
  const credit = next.status === "paid" && po.creditDraw;
  return {
    ...po,
    status: next.status,
    timeline: [...po.timeline, { status: next.status, at: now, actor, ...(note || credit ? { note: note ?? "Supplier paid directly from the contractor's credit cap" } : {}) }],
    ...(credit && po.creditDraw ? { creditDraw: { ...po.creditDraw, supplierPaidAt: now } } : {}),
  };
}

export type CreditFit =
  | { status: "fits"; leftAfter: Halalas }
  | { status: "over"; overBy: Halalas }
  | { status: "no_cap" };

/**
 * Whether an order total fits what is left of the credit cap. "Left" is
 * always cap minus drawn, read before this order is drawn.
 */
export function creditFit(totalInclVat: Halalas, facility: Pick<CreditFacility, "cap" | "drawn"> | null): CreditFit {
  if (!facility) return { status: "no_cap" };
  const available = availableCredit(facility);
  return totalInclVat <= available
    ? { status: "fits", leftAfter: halalas(available - totalInclVat) }
    : { status: "over", overBy: halalas(totalInclVat - available) };
}
