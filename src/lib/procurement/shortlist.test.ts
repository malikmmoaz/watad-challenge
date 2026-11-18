import { describe, expect, it } from "vitest";
import { sar } from "@/domain/money";
import type { ShortlistReasonCode } from "@/domain/types";
import { materials, rfq, supplier } from "./fixtures.test-util";
import { SHORTLIST_WEIGHTS, assessSupplier, buildShortlist, estimateRfqValue, type ShortlistContext } from "./shortlist";

const ctx: ShortlistContext = { materials, facility: { available: sar(400_000) }, priceIndex: {} };
const reasonOf = (row: ReturnType<typeof assessSupplier>, ...codes: ShortlistReasonCode[]) =>
  row.reasons.find((r) => codes.includes(r.code))!;

describe("estimateRfqValue", () => {
  it("prices the RFQ at benchmark incl. 15% VAT", () => {
    expect(estimateRfqValue(rfq, materials)).toBe(sar(51_750));
  });
});

describe("assessSupplier", () => {
  it("has weights that add up to 100", () => {
    expect(Object.values(SHORTLIST_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("gives an ideal supplier 100 with no 'why not'", () => {
    const row = assessSupplier(
      supplier("a", {}, { onTimeRate: 0.98, fillRate: 0.99, avgResponseHours: 3 }),
      rfq,
      { ...ctx, priceIndex: { a: 0.93 } },
    );
    expect(row.eligible).toBe(true);
    expect(row.matchScore).toBe(100);
    expect(row.whyNot).toEqual([]);
    expect(row.fitsCreditCap).toBe(true);
    expect(row.reasons.reduce((s, r) => s + r.points, 0)).toBe(100);
  });

  it("excludes a supplier that does not deliver to the site, and says why", () => {
    const row = assessSupplier(supplier("a", { serviceCities: ["Jeddah"] }), rfq, ctx);
    expect(row.eligible).toBe(false);
    expect(row.matchScore).toBe(0);
    expect(reasonOf(row, "does_not_deliver").polarity).toBe("negative");
    expect(row.whyNot).toContain("Does not deliver to Riyadh");
  });

  it("excludes a supplier that stocks none of the requested categories", () => {
    const row = assessSupplier(supplier("a", { categories: ["finishes"] }), rfq, ctx);
    expect(row.eligible).toBe(false);
    expect(row.whyNot).toContain("Stocks none of the requested categories");
  });

  it("keeps a partial-category supplier eligible and names what is missing", () => {
    const row = assessSupplier(supplier("a", { categories: ["rebar_steel"] }), rfq, ctx);
    expect(row.eligible).toBe(true);
    const r = reasonOf(row, "stocks_category");
    expect(r.polarity).toBe("negative");
    expect(r.points).toBe(SHORTLIST_WEIGHTS.category / 2);
    expect(r.text).toContain("1 of 2");
    expect(r.text).toContain("missing: cement");
  });

  it("scores a more reliable supplier higher", () => {
    const good = assessSupplier(supplier("a", {}, { onTimeRate: 0.96, fillRate: 0.98 }), rfq, ctx);
    const poor = assessSupplier(supplier("b", {}, { onTimeRate: 0.78, fillRate: 0.86 }), rfq, ctx);
    expect(good.matchScore).toBeGreaterThan(poor.matchScore);
    expect(reasonOf(poor, "on_time_record").polarity).toBe("negative");
  });

  it("scores a slow responder lower and says so", () => {
    const fast = assessSupplier(supplier("a", {}, { avgResponseHours: 3 }), rfq, ctx);
    const slow = assessSupplier(supplier("b", {}, { avgResponseHours: 30 }), rfq, ctx);
    expect(reasonOf(fast, "responsiveness").points).toBe(SHORTLIST_WEIGHTS.responsiveness);
    expect(reasonOf(slow, "responsiveness").polarity).toBe("negative");
    expect(reasonOf(slow, "responsiveness").text).toContain("Slow to respond");
  });

  it("uses price history against the 90-day benchmark", () => {
    const c = { ...ctx, priceIndex: { cheap: 0.95, dear: 1.08 } };
    const cheap = reasonOf(assessSupplier(supplier("cheap"), rfq, c), "price_history");
    const dear = reasonOf(assessSupplier(supplier("dear"), rfq, c), "price_history");
    const unknown = reasonOf(assessSupplier(supplier("none"), rfq, c), "price_history");
    expect(cheap.text).toContain("5% below");
    expect(cheap.polarity).toBe("positive");
    expect(dear.text).toContain("8% above");
    expect(dear.polarity).toBe("negative");
    expect(cheap.points).toBeGreaterThan(dear.points);
    expect(unknown.points).toBe(SHORTLIST_WEIGHTS.price / 2);
  });

  describe("credit cap", () => {
    const credit = (row: ReturnType<typeof assessSupplier>) =>
      reasonOf(row, "accepts_credit", "no_credit_acceptance", "exceeds_credit_cap");

    it("gives full points when the order fits the available cap", () => {
      const row = assessSupplier(supplier("a"), rfq, ctx);
      expect(credit(row).code).toBe("accepts_credit");
      expect(credit(row).points).toBe(SHORTLIST_WEIGHTS.credit);
      expect(credit(row).text).toContain("SAR 51,750.00");
      expect(row.fitsCreditCap).toBe(true);
    });

    it("flags an order above the available cap", () => {
      const row = assessSupplier(supplier("a"), rfq, { ...ctx, facility: { available: sar(20_000) } });
      expect(credit(row).code).toBe("exceeds_credit_cap");
      expect(credit(row).polarity).toBe("negative");
      expect(row.fitsCreditCap).toBe(false);
    });

    it("scores zero when the contractor wants credit and the supplier does not accept it", () => {
      const row = assessSupplier(supplier("a", { acceptsPlatformCredit: false }), rfq, ctx);
      expect(credit(row).code).toBe("no_credit_acceptance");
      expect(credit(row).points).toBe(0);
      expect(row.fitsCreditCap).toBeNull();
    });

    it("does not zero a non-credit supplier when the contractor is not paying with credit", () => {
      const row = assessSupplier(supplier("a", { acceptsPlatformCredit: false }), { ...rfq, wantsCredit: false }, ctx);
      expect(credit(row).points).toBeGreaterThan(0);
    });

    it("handles a contractor with no approved credit cap", () => {
      const row = assessSupplier(supplier("a"), rfq, { ...ctx, facility: null });
      expect(credit(row).text).toContain("no approved credit cap");
      expect(row.fitsCreditCap).toBeNull();
    });
  });

  it("flags a payment terms mismatch", () => {
    const row = assessSupplier(supplier("a", { acceptedTerms: [{ kind: "advance" }] }), rfq, ctx);
    expect(reasonOf(row, "terms_mismatch").polarity).toBe("negative");
    const other = assessSupplier(supplier("a", { acceptedTerms: [{ kind: "net", days: 60 }] }), rfq, ctx);
    expect(other.reasons.some((r) => r.code === "terms_mismatch")).toBe(true);
  });

  it("rates a new vetted supplier neutrally instead of punishing missing history", () => {
    const row = assessSupplier(supplier("n", {}, { ordersCompleted: 1, onTimeRate: 0, fillRate: 0 }), rfq, ctx);
    const r = reasonOf(row, "on_time_record");
    expect(r.points).toBe((SHORTLIST_WEIGHTS.onTime + SHORTLIST_WEIGHTS.fillRate) / 2);
    expect(r.text).toContain("not enough history");
    expect(row.reasons.some((x) => x.code === "fill_rate")).toBe(false);
  });
});

describe("buildShortlist", () => {
  const established = ["a", "b", "c", "d", "e", "f"].map((id, i) => supplier(id, {}, { onTimeRate: 0.97 - i * 0.03 }));
  const newcomer = supplier("new", {}, { ordersCompleted: 0, avgResponseHours: 20 });

  it("returns the top suppliers by match score and recommends the first three", () => {
    const { shortlisted, notShortlisted } = buildShortlist(established, rfq, ctx);
    expect(shortlisted.map((r) => r.supplierId)).toEqual(["a", "b", "c", "d", "e"]);
    expect(shortlisted.map((r) => r.recommended)).toEqual([true, true, true, false, false]);
    expect(shortlisted.every((r) => r.shortlisted && !r.newSupplierSlot)).toBe(true);
    expect(notShortlisted.map((r) => r.supplierId)).toEqual(["f"]);
    expect(notShortlisted[0]!.whyNot.at(-1)).toContain("below the top 5");
  });

  it("reserves one slot for the best vetted newcomer", () => {
    const { shortlisted, notShortlisted } = buildShortlist([...established, newcomer], rfq, ctx);
    expect(shortlisted.map((r) => r.supplierId)).toEqual(["a", "b", "c", "d", "new"]);
    expect(shortlisted.filter((r) => r.newSupplierSlot).map((r) => r.supplierId)).toEqual(["new"]);
    expect(shortlisted.at(-1)!.why.at(-1)).toContain("Reserved slot");
    expect(notShortlisted.map((r) => r.supplierId)).toEqual(["e", "f"]);
  });

  it("does not reserve the slot for an unvetted or ineligible newcomer", () => {
    const unvetted = { ...newcomer, vetted: false };
    expect(buildShortlist([...established, unvetted], rfq, ctx).shortlisted.some((r) => r.supplierId === "new")).toBe(false);
    const faraway = { ...newcomer, serviceCities: ["Tabuk" as const] };
    const res = buildShortlist([...established, faraway], rfq, ctx);
    expect(res.shortlisted.some((r) => r.supplierId === "new")).toBe(false);
    expect(res.shortlisted).toHaveLength(5);
  });

  it("marks a newcomer that earned its place on score without dropping anyone", () => {
    const { shortlisted } = buildShortlist([...established.slice(0, 3), newcomer], rfq, ctx);
    expect(shortlisted).toHaveLength(4);
    expect(shortlisted.find((r) => r.supplierId === "new")!.newSupplierSlot).toBe(true);
  });

  it("never shortlists an ineligible supplier, even with free slots", () => {
    const { shortlisted, notShortlisted } = buildShortlist([supplier("a"), supplier("x", { categories: ["finishes"] })], rfq, ctx);
    expect(shortlisted.map((r) => r.supplierId)).toEqual(["a"]);
    expect(notShortlisted[0]!.eligible).toBe(false);
  });

  it("is deterministic on ties", () => {
    expect(buildShortlist([supplier("b"), supplier("a")], rfq, ctx).shortlisted.map((r) => r.supplierId)).toEqual(["a", "b"]);
  });
});
