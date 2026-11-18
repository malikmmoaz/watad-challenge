import { describe, expect, it } from "vitest";
import type { DemoState } from "@/data";
import { sar } from "@/domain/money";
import type { OrgId } from "@/domain/types";
import { NET30, offer, rfq } from "./fixtures.test-util";
import { placePurchaseOrders } from "./po";
import { actOnPurchaseOrder, canOffer, poActionFor, submitOffer, validateOfferDraft, withdrawOffer, type OfferDraft } from "./supplier-offer";
import { supplier } from "./fixtures.test-util";

const me = "sup_me" as OrgId;
const now = "2026-11-30T10:00:00Z";
const open = { ...rfq, status: "sent" as const, invitedSupplierIds: [me] };
const state = (over: Partial<DemoState> = {}): DemoState => ({ rfqs: [open], offers: [], purchaseOrders: [], creditCases: [], creditFacilities: [], ...over });
const draft = (over: Partial<OfferDraft> = {}): OfferDraft => ({
  lines: [
    { rfqLineId: "rebar", unitPriceSar: 2950, quantityAvailable: 10, stock: "in_stock", brand: "Rajhi Steel", isAlternative: false, alternativeNote: "" },
    { rfqLineId: "cement", unitPriceSar: 15.2, quantityAvailable: 1000, stock: "in_stock", brand: "Yamama Cement", isAlternative: false, alternativeNote: "" },
  ],
  deliveryFeeSar: 1200,
  leadTimeDays: 4,
  paymentTerms: NET30,
  localContent: true,
  validDays: 7,
  notes: "",
  ...over,
});

describe("validateOfferDraft", () => {
  it("accepts a complete offer", () => {
    expect(validateOfferDraft(open, draft())).toEqual({});
  });

  it("allows leaving a line out by not pricing it", () => {
    const d = draft();
    d.lines[1]!.unitPriceSar = 0;
    expect(validateOfferDraft(open, d)).toEqual({});
  });

  it("explains every problem", () => {
    const d = draft({ deliveryFeeSar: -1, leadTimeDays: 0, validDays: 90 });
    d.lines[0]!.quantityAvailable = 11;
    d.lines[1]!.brand = " ";
    d.lines[1]!.isAlternative = true;
    expect(validateOfferDraft(open, d)).toEqual({
      "line:rebar:qty": "At most the 10 requested.",
      "line:cement:brand": "Name the brand you will supply.",
      "line:cement:alt": "Say how the alternative differs from the spec.",
      deliveryFee: "Enter a delivery fee of 0 or more.",
      leadTime: "Lead time is 1 to 120 whole days.",
      validDays: "Valid for 1 to 60 days.",
    });
  });

  it("requires at least one priced line", () => {
    const d = draft();
    d.lines.forEach((l) => (l.unitPriceSar = 0));
    expect(validateOfferDraft(open, d).lines).toBeDefined();
  });
});

describe("canOffer", () => {
  it("only lets invited suppliers offer on an open request", () => {
    expect(canOffer(open, me)).toEqual({ ok: true });
    expect(canOffer(open, "sup_other" as OrgId)).toMatchObject({ ok: false, reason: expect.stringContaining("not invited") });
    expect(canOffer({ ...open, status: "awarded" }, me)).toMatchObject({ ok: false, reason: expect.stringContaining("awarded") });
    expect(canOffer({ ...open, status: "draft" }, me)).toMatchObject({ ok: false });
  });
});

describe("submitOffer", () => {
  it("stores the offer in halalas and moves the RFQ to offers received", () => {
    const r = submitOffer(state(), open.id, me, draft({ notes: " Pump available " }), now);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.offer).toMatchObject({ rfqId: open.id, supplierId: me, status: "submitted", deliveryFee: sar(1200), leadTimeDays: 4, localContent: true, validUntil: "2026-12-07T10:00:00.000Z", notes: "Pump available" });
    expect(r.offer.lines.map((l) => l.unitPrice)).toEqual([sar(2950), sar(15.2)]);
    expect(r.state.rfqs[0]!.status).toBe("offers_received");
    expect(r.state.offers).toEqual([r.offer]);
  });

  it("drops unpriced lines from the offer", () => {
    const d = draft();
    d.lines[1]!.unitPriceSar = 0;
    const r = submitOffer(state(), open.id, me, d, now);
    if (!r.ok) throw new Error("expected ok");
    expect(r.offer.lines.map((l) => l.rfqLineId)).toEqual(["rebar"]);
  });

  it("replaces the supplier's earlier offer on revision", () => {
    const first = submitOffer(state(), open.id, me, draft(), now);
    if (!first.ok) throw new Error("expected ok");
    const second = submitOffer(first.state, open.id, me, draft({ deliveryFeeSar: 900 }), "2026-11-30T11:00:00Z");
    if (!second.ok) throw new Error("expected ok");
    expect(second.state.offers.map((o) => o.status)).toEqual(["withdrawn", "submitted"]);
  });

  it("refuses an uninvited supplier and invalid drafts without changing state", () => {
    expect(submitOffer(state(), open.id, "sup_x" as OrgId, draft(), now)).toMatchObject({ ok: false, errors: { form: expect.any(String) } });
    expect(submitOffer(state(), open.id, me, draft({ leadTimeDays: 0 }), now)).toMatchObject({ ok: false, errors: { leadTime: expect.any(String) } });
  });

  it("withdraws a submitted offer", () => {
    const r = submitOffer(state(), open.id, me, draft(), now);
    if (!r.ok) throw new Error("expected ok");
    expect(withdrawOffer(r.state, r.offer.id).offers[0]!.status).toBe("withdrawn");
  });
});

describe("PO actions by role", () => {
  const facility = { creditCaseId: "cc" as never, contractorId: rfq.contractorId, cap: sar(1e6), drawn: sar(0), band: "B" as const, maxTenorDays: 60 as const, profitRate: 0.03, conditions: [], approvedAt: now, reviewDue: now };
  const placed = (method: "platform_credit" | "bank_transfer") => {
    const s = state({ rfqs: [{ ...open, status: "offers_received" }], offers: [offer("a", 3000, 15)], creditFacilities: [facility] });
    const r = placePurchaseOrders(s, { rfqId: open.id, orders: [{ offerId: "a" as never }], method, suppliers: [supplier("sup_a")], now });
    if (!r.ok) throw new Error(r.error);
    return r.pos[0]!;
  };

  it("gives each step to the right party", () => {
    let po = placed("bank_transfer");
    const order: [string, "supplier" | "contractor"][] = [
      ["placed", "supplier"],
      ["confirmed", "supplier"],
      ["dispatched", "contractor"],
      ["delivered", "supplier"],
      ["invoiced", "contractor"],
    ];
    for (const [status, role] of order) {
      expect(po.status).toBe(status);
      const other = role === "supplier" ? "contractor" : "supplier";
      expect(poActionFor(po, other)).toBeNull();
      expect(actOnPurchaseOrder(po, other, now)).toBe(po);
      po = actOnPurchaseOrder(po, role, now);
    }
    expect(po.status).toBe("paid");
    expect(poActionFor(po, "contractor")).toBeNull();
  });

  it("pays a credit PO's supplier directly as soon as it invoices", () => {
    let po = placed("platform_credit");
    po = actOnPurchaseOrder(po, "supplier", now);
    po = actOnPurchaseOrder(po, "supplier", now);
    po = actOnPurchaseOrder(po, "contractor", now);
    po = actOnPurchaseOrder(po, "supplier", now, "ZATCA e-invoice INV-1");
    expect(po.status).toBe("paid");
    expect(po.timeline.map((e) => e.status)).toEqual(["placed", "confirmed", "dispatched", "delivered", "invoiced", "paid"]);
    expect(po.timeline[4]!.note).toBe("ZATCA e-invoice INV-1");
    expect(po.creditDraw!.supplierPaidAt).toBe(now);
  });
});
