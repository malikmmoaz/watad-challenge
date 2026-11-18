import { describe, expect, it } from "vitest";
import type { DemoState } from "@/data";
import { sar } from "@/domain/money";
import type { CreditCaseId, CreditFacility, OfferId, OrgId } from "@/domain/types";
import { offer, rfq, supplier } from "./fixtures.test-util";
import { PO_STEPS, advancePurchaseOrder, creditEligibility, placePurchaseOrders, quoteOrder } from "./po";

const facility: CreditFacility = {
  creditCaseId: "cc_1" as CreditCaseId,
  contractorId: rfq.contractorId,
  cap: sar(500_000),
  drawn: sar(100_000),
  available: sar(400_000),
  band: "B",
  maxTenorDays: 60,
  profitRate: 0.03,
  conditions: [],
  approvedAt: "2026-11-01T00:00:00Z",
  reviewDue: "2027-05-01",
};
const now = "2026-11-30T09:00:00Z";
const suppliers = [supplier("sup_a"), supplier("sup_b"), supplier("sup_c", { acceptsPlatformCredit: false })];
const state = (over: Partial<DemoState> = {}): DemoState => ({
  rfqs: [{ ...rfq, status: "offers_received" }],
  offers: [offer("a", 3000, 15), offer("b", 2800, 18), offer("c", 3200, 14)],
  purchaseOrders: [],
  creditCases: [],
  creditFacilities: [facility],
  ...over,
});
const place = (s: DemoState, orders: { offerId: string; rfqLineIds?: string[] }[], method: "platform_credit" | "bank_transfer" = "bank_transfer") =>
  placePurchaseOrders(s, { rfqId: rfq.id, orders: orders.map((o) => ({ ...o, offerId: o.offerId as OfferId })), method, suppliers, now });

describe("quoteOrder", () => {
  it("prices goods plus delivery with 15% VAT", () => {
    // 10 t x 3,000 + 1,000 x 15 = 45,000; + 1,000 delivery; VAT 6,900
    expect(quoteOrder(rfq, offer("a", 3000, 15))).toMatchObject({ subtotal: sar(45_000), deliveryFee: sar(1000), vat: sar(6900), totalInclVat: sar(52_900), rfqLineIds: ["rebar", "cement"] });
  });

  it("prices only the chosen lines", () => {
    expect(quoteOrder(rfq, offer("a", 3000, 15), ["cement"])).toMatchObject({ subtotal: sar(15_000), totalInclVat: sar(18_400) });
  });
});

describe("creditEligibility", () => {
  it("allows an order that fits the available cap with a credit-accepting supplier", () => {
    expect(creditEligibility(sar(52_900), facility, [suppliers[0]!])).toEqual({ ok: true, tenorDays: 60 });
  });

  it("explains each refusal", () => {
    expect(creditEligibility(sar(1), null, [])).toMatchObject({ ok: false, reason: expect.stringContaining("no approved credit cap") });
    expect(creditEligibility(sar(1), facility, [suppliers[2]!])).toMatchObject({ ok: false, reason: expect.stringContaining("does not accept platform credit") });
    expect(creditEligibility(sar(400_000.01), facility, [suppliers[0]!])).toMatchObject({ ok: false, reason: expect.stringContaining("above your available credit cap") });
  });
});

describe("placePurchaseOrders", () => {
  it("places a bank-transfer PO and awards the RFQ", () => {
    const r = place(state(), [{ offerId: "a" }]);
    if (!r.ok) throw new Error(r.error);
    expect(r.pos).toHaveLength(1);
    const po = r.pos[0]!;
    expect(po).toMatchObject({ status: "placed", supplierId: "sup_a", totalInclVat: sar(52_900), paymentMethod: "bank_transfer", expectedDelivery: "2026-12-05" });
    expect(po.creditDraw).toBeUndefined();
    expect(po.timeline).toEqual([{ status: "placed", at: now, actor: "contractor" }]);
    expect(r.state.rfqs[0]!.status).toBe("awarded");
    expect(r.state.offers.map((o) => o.status)).toEqual(["awarded", "not_selected", "not_selected"]);
    expect(r.state.purchaseOrders[0]).toBe(po);
    expect(r.state.creditFacilities[0]).toBe(facility);
  });

  it("draws from the credit cap as Murabaha with markup, APR and due date", () => {
    const r = place(state(), [{ offerId: "a" }], "platform_credit");
    if (!r.ok) throw new Error(r.error);
    expect(r.pos[0]!.creditDraw).toMatchObject({
      principal: sar(52_900),
      tenorDays: 60,
      profitRate: 0.03,
      markup: sar(1587),
      totalRepayable: sar(54_487),
      dueDate: "2027-02-03", // 5 days lead time + 60 days
    });
    expect(r.pos[0]!.creditDraw!.apr).toBeCloseTo(0.1825, 4);
    expect(r.state.creditFacilities[0]).toMatchObject({ drawn: sar(152_900), available: sar(347_100) });
  });

  it("refuses credit above the available cap and leaves state untouched", () => {
    const s = state({ creditFacilities: [{ ...facility, available: sar(10_000) }] });
    expect(place(s, [{ offerId: "a" }], "platform_credit")).toEqual({ ok: false, error: "This order is above your available credit cap." });
  });

  it("refuses credit when a supplier does not accept it", () => {
    expect(place(state(), [{ offerId: "c" }], "platform_credit")).toMatchObject({ ok: false });
  });

  it("places one PO per supplier for a basket split and draws the combined total", () => {
    const r = place(state(), [{ offerId: "b", rfqLineIds: ["rebar"] }, { offerId: "c", rfqLineIds: ["cement"] }]);
    if (!r.ok) throw new Error(r.error);
    expect(r.pos.map((p) => [p.supplierId, p.totalInclVat])).toEqual([
      ["sup_b", sar(33_350)], // (28,000 + 1,000) x 1.15
      ["sup_c", sar(17_250)], // (14,000 + 1,000) x 1.15
    ]);
    expect(new Set(r.pos.map((p) => p.id)).size).toBe(2);
    expect(r.pos[0]!.timeline[0]!.note).toBe("Part 1 of 2 of a split order");
    expect(r.state.offers.map((o) => o.status)).toEqual(["not_selected", "awarded", "awarded"]);
  });

  it("rejects ordering the same line twice, an unknown offer, and a second award", () => {
    expect(place(state(), [{ offerId: "a" }, { offerId: "b" }])).toMatchObject({ ok: false, error: expect.stringContaining("two suppliers") });
    expect(place(state(), [{ offerId: "zzz" }])).toMatchObject({ ok: false });
    expect(place(state(), [])).toMatchObject({ ok: false });
    const once = place(state(), [{ offerId: "a" }]);
    if (!once.ok) throw new Error(once.error);
    expect(place(once.state, [{ offerId: "b" }])).toMatchObject({ ok: false, error: expect.stringContaining("already been awarded") });
  });

  it("does not touch other RFQs' offers", () => {
    const other = { ...offer("x", 1, 1), rfqId: "rfq_other" as typeof rfq.id, supplierId: "sup_x" as OrgId };
    const r = place(state({ offers: [offer("a", 3000, 15), other] }), [{ offerId: "a" }]);
    if (!r.ok) throw new Error(r.error);
    expect(r.state.offers[1]).toBe(other);
  });
});

describe("advancePurchaseOrder", () => {
  it("walks issued -> accepted -> dispatched -> delivered -> invoiced -> paid, then stops", () => {
    const r = place(state(), [{ offerId: "a" }], "platform_credit");
    if (!r.ok) throw new Error(r.error);
    let po = r.pos[0]!;
    const seen = [po.status];
    for (let i = 0; i < 6; i++) {
      po = advancePurchaseOrder(po, `2026-12-0${i + 1}T00:00:00Z`);
      seen.push(po.status);
    }
    expect(seen).toEqual(["placed", "confirmed", "dispatched", "delivered", "invoiced", "paid", "paid"]);
    expect(PO_STEPS.map((s) => s.label)).toEqual(["Issued", "Accepted by supplier", "Dispatched", "Delivered", "Invoiced", "Paid"]);
    expect(po.timeline.map((e) => e.actor)).toEqual(["contractor", "supplier", "supplier", "contractor", "supplier", "platform"]);
    expect(po.timeline.at(-1)!.note).toContain("paid directly");
    expect(po.creditDraw!.supplierPaidAt).toBe("2026-12-05T00:00:00Z");
  });

  it("leaves a cancelled PO alone", () => {
    const r = place(state(), [{ offerId: "a" }]);
    if (!r.ok) throw new Error(r.error);
    const cancelled = { ...r.pos[0]!, status: "cancelled" as const };
    expect(advancePurchaseOrder(cancelled, now)).toBe(cancelled);
  });
});
