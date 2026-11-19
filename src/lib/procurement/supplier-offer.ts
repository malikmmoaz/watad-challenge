/**
 * Supplier side of an RFQ (pure): validate an offer (bid) form, submit or
 * revise it, and the PO actions each party may take. Returns new state.
 */
import type { DemoState } from "@/data";
import { sar } from "@/domain/money";
import type { Offer, OfferId, OrgId, PaymentTerms, PoStatus, PurchaseOrder, Rfq, Role, StockStatus } from "@/domain/types";
import { fill } from "@/i18n/core";
import { supplier as supplierDict } from "@/i18n/supplier";
import { advancePurchaseOrder } from "./po";
import { MAX_DELIVERY_FEE_SAR, MAX_UNIT_PRICE_SAR, WHOLE_UNITS } from "./rfq-draft";

export interface OfferLineDraft {
  rfqLineId: string;
  /** SAR per unit excl. VAT, as typed; empty or 0 means "not quoting this line". */
  unitPriceSar: number;
  quantityAvailable: number;
  stock: StockStatus;
  brand: string;
  isAlternative: boolean;
  alternativeNote: string;
}

export interface OfferDraft {
  lines: OfferLineDraft[];
  deliveryFeeSar: number;
  leadTimeDays: number;
  paymentTerms: PaymentTerms;
  localContent: boolean;
  validDays: number;
  notes: string;
}

/** Field -> message. Line fields are keyed `line:<rfqLineId>:<field>`. */
export type OfferErrors = Record<string, string>;

const ok = (n: number) => Number.isFinite(n);

/**
 * The English messages come from the supplier dictionary, the same strings the form shows: the UI
 * finds the Arabic by matching this English (useProcurementI18n().logic), so the two cannot drift.
 */
const E = supplierDict.en.errors;

export function validateOfferDraft(rfq: Rfq, draft: OfferDraft): OfferErrors {
  const e: OfferErrors = {};
  const quoted = draft.lines.filter((l) => ok(l.unitPriceSar) && l.unitPriceSar > 0);
  if (quoted.length === 0) e.lines = E.linesNone;
  for (const l of draft.lines) {
    const line = rfq.lines.find((x) => x.id === l.rfqLineId);
    if (!line) {
      e[`line:${l.rfqLineId}:price`] = E.notInRequest;
      continue;
    }
    // An empty price (NaN from the number input) means "not quoting this line", as the form says.
    if (l.unitPriceSar < 0 || l.unitPriceSar === Infinity) e[`line:${l.rfqLineId}:price`] = E.price;
    else if (l.unitPriceSar > MAX_UNIT_PRICE_SAR) e[`line:${l.rfqLineId}:price`] = E.priceTooHigh;
    if (l.unitPriceSar > 0) {
      if (!ok(l.quantityAvailable) || l.quantityAvailable <= 0) e[`line:${l.rfqLineId}:qty`] = E.quantity;
      else if (l.quantityAvailable > line.quantity) e[`line:${l.rfqLineId}:qty`] = fill(E.atMost, { qty: line.quantity });
      else if (WHOLE_UNITS.has(line.unit) && !Number.isInteger(l.quantityAvailable)) e[`line:${l.rfqLineId}:qty`] = E.qtyWhole;
      if (l.brand.trim() === "") e[`line:${l.rfqLineId}:brand`] = E.brand;
      if (l.isAlternative && l.alternativeNote.trim() === "") e[`line:${l.rfqLineId}:alt`] = E.alternative;
    }
  }
  if (!ok(draft.deliveryFeeSar) || draft.deliveryFeeSar < 0) e.deliveryFee = E.deliveryFee;
  else if (draft.deliveryFeeSar > MAX_DELIVERY_FEE_SAR) e.deliveryFee = E.feeTooHigh;
  if (!ok(draft.leadTimeDays) || !Number.isInteger(draft.leadTimeDays) || draft.leadTimeDays < 1 || draft.leadTimeDays > 120) e.leadTime = E.leadTime;
  if (!ok(draft.validDays) || !Number.isInteger(draft.validDays) || draft.validDays < 1 || draft.validDays > 60) e.validDays = E.validDays;
  return e;
}

/** Where the request stands for this supplier. */
export function canOffer(rfq: Rfq, supplierId: OrgId): { ok: true } | { ok: false; reason: string } {
  if (!rfq.invitedSupplierIds.includes(supplierId)) return { ok: false, reason: E.notInvited };
  if (rfq.status === "awarded") return { ok: false, reason: E.alreadyAwarded };
  if (rfq.status !== "sent" && rfq.status !== "offers_received") return { ok: false, reason: E.notOpen };
  return { ok: true };
}

export type SubmitResult = { ok: true; state: DemoState; offer: Offer } | { ok: false; errors: OfferErrors };

/**
 * Submits an offer, or revises the supplier's earlier one (the earlier offer
 * is withdrawn so the contractor only ever compares the latest). The first
 * offer moves the RFQ to "offers received".
 */
export function submitOffer(state: DemoState, rfqId: string, supplierId: OrgId, draft: OfferDraft, now: string): SubmitResult {
  const rfq = state.rfqs.find((r) => r.id === rfqId);
  if (!rfq) return { ok: false, errors: { form: E.requestNotFound } };
  const allowed = canOffer(rfq, supplierId);
  if (!allowed.ok) return { ok: false, errors: { form: allowed.reason } };
  const errors = validateOfferDraft(rfq, draft);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const stamp = Date.parse(now);
  const offer: Offer = {
    id: `off_${stamp.toString(36)}` as OfferId,
    rfqId: rfq.id,
    supplierId,
    status: "submitted",
    lines: draft.lines
      .filter((l) => l.unitPriceSar > 0)
      .map((l) => ({
        rfqLineId: l.rfqLineId,
        unitPrice: sar(l.unitPriceSar),
        quantityAvailable: l.quantityAvailable,
        stock: l.stock,
        brand: l.brand.trim(),
        isAlternative: l.isAlternative,
        ...(l.isAlternative ? { alternativeNote: l.alternativeNote.trim() } : {}),
      })),
    deliveryFee: sar(draft.deliveryFeeSar),
    leadTimeDays: draft.leadTimeDays,
    paymentTerms: draft.paymentTerms,
    localContent: draft.localContent,
    validUntil: new Date(stamp + draft.validDays * 86_400_000).toISOString(),
    submittedAt: now,
    ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
  };

  return {
    ok: true,
    offer,
    state: {
      ...state,
      rfqs: state.rfqs.map((r) => (r.id === rfq.id && r.status === "sent" ? { ...r, status: "offers_received" } : r)),
      offers: [...state.offers.map((o) => (o.rfqId === rfq.id && o.supplierId === supplierId && o.status === "submitted" ? { ...o, status: "withdrawn" as const } : o)), offer],
    },
  };
}

export function withdrawOffer(state: DemoState, offerId: string): DemoState {
  return { ...state, offers: state.offers.map((o) => (o.id === offerId && o.status === "submitted" ? { ...o, status: "withdrawn" } : o)) };
}

/** Who moves a PO from each status, and what the button says. */
export const PO_ACTIONS: Partial<Record<PoStatus, { by: Role; label: string }>> = {
  placed: { by: "supplier", label: "Accept purchase order" },
  confirmed: { by: "supplier", label: "Mark as dispatched" },
  dispatched: { by: "contractor", label: "Confirm delivery on site" },
  delivered: { by: "supplier", label: "Issue invoice" },
  invoiced: { by: "contractor", label: "Mark as paid" },
};

/** The action `role` can take on this PO now, if any. Credit POs are paid by the financier, never by the contractor. */
export function poActionFor(po: PurchaseOrder, role: Role): { by: Role; label: string } | null {
  const a = PO_ACTIONS[po.status];
  if (!a || a.by !== role) return null;
  if (po.status === "invoiced" && po.creditDraw) return null;
  return a;
}

/**
 * Applies `role`'s action. When the supplier invoices a credit PO, the
 * financier pays the supplier straight away from the credit cap.
 */
export function actOnPurchaseOrder(po: PurchaseOrder, role: Role, now: string, note?: string): PurchaseOrder {
  if (!poActionFor(po, role)) return po;
  const next = advancePurchaseOrder(po, now, note);
  return next.status === "invoiced" && next.creditDraw ? advancePurchaseOrder(next, now) : next;
}

/** What the supplier sees as the next step on a PO, and whether it is theirs to take. */
export function supplierNextStep(po: PurchaseOrder): { text: string; yours: boolean } {
  const mine = poActionFor(po, "supplier");
  if (mine) return { text: mine.label, yours: true };
  switch (po.status) {
    case "dispatched":
      return { text: "Waiting for the contractor to confirm delivery", yours: false };
    case "invoiced":
      return { text: "Waiting for the contractor's bank transfer", yours: false };
    case "paid":
      return { text: po.creditDraw ? "Paid to you directly from the contractor's credit cap" : "Paid", yours: false };
    case "cancelled":
      return { text: "Cancelled", yours: false };
    default:
      return { text: "Waiting for the contractor", yours: false };
  }
}
