import { describe, expect, it } from "vitest";
import { sar } from "@/domain/money";
import type { MaterialId, Offer, OrgId, Rfq } from "@/domain/types";
import {
  COMPARISON_WEIGHTS,
  blindLabels,
  compareOffers,
  describeTerms,
  landedCost,
  priceFlag,
  suggestBasketSplit,
  termsScore,
  type ComparisonContext,
} from "./comparison";
import { materials, offer, rfq, supplier, today } from "./fixtures.test-util";

const ctx: ComparisonContext = { materials, suppliers: [], today };
const byId = (rows: ReturnType<typeof compareOffers>, id: string) => rows.find((r) => r.offerId === id)!;
const pointsOf = (row: ReturnType<typeof compareOffers>[number], factor: string) =>
  row.scoreBreakdown.find((p) => p.factor === factor)!.points;

describe("landedCost", () => {
  it("adds delivery, then 15% VAT on goods plus delivery", () => {
    expect(landedCost(sar(45_000), sar(1000))).toEqual({
      subtotal: sar(45_000),
      deliveryFee: sar(1000),
      vat: sar(6900),
      landedCostInclVat: sar(52_900),
    });
  });

  it("rounds VAT to whole halalas", () => {
    expect(landedCost(sar(99.99), sar(0)).vat).toBe(1500);
  });
});

describe("priceFlag", () => {
  it.each([
    [-5, "below_market"],
    [-3, "in_line"],
    [0, "in_line"],
    [3, "in_line"],
    [3.1, "above_market"],
  ] as const)("%d%% vs benchmark is %s", (pct, flag) => {
    expect(priceFlag(pct)).toBe(flag);
  });
});

describe("payment terms", () => {
  it("describes each kind", () => {
    expect(describeTerms({ kind: "advance" })).toBe("Payment in advance");
    expect(describeTerms({ kind: "on_delivery" })).toBe("Payment on delivery");
    expect(describeTerms({ kind: "net", days: 60 })).toBe("Net 60 days");
    expect(describeTerms({ kind: "platform_credit", days: 90 })).toContain("supplier paid directly");
  });

  it("ranks longer terms as better for the contractor", () => {
    const scores = [{ kind: "advance" }, { kind: "on_delivery" }, { kind: "net", days: 30 }, { kind: "net", days: 60 }, { kind: "platform_credit", days: 90 }] as const;
    const s = scores.map(termsScore);
    expect([...s].sort((a, b) => a - b)).toEqual(s);
    expect(new Set(s).size).toBe(s.length);
  });
});

describe("compareOffers", () => {
  it("has weights that add up to 100", () => {
    expect(Object.values(COMPARISON_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("computes landed cost incl. delivery and 15% VAT", () => {
    const [row] = compareOffers(rfq, [offer("a", 3000, 15)], ctx);
    // 10 t x 3,000 + 1,000 bags x 15 = 45,000; + 1,000 delivery; + 15% VAT
    expect(row).toMatchObject({ subtotal: sar(45_000), deliveryFee: sar(1000), vat: sar(6900), landedCostInclVat: sar(52_900) });
    expect(row!.evaluatedCost).toBe(row!.landedCostInclVat);
    expect(row!.rank).toBe(1);
  });

  it("ranks the cheaper of two otherwise equal offers first", () => {
    const rows = compareOffers(rfq, [offer("dear", 3200, 16), offer("cheap", 3000, 15)], ctx);
    expect(rows.map((r) => r.offerId)).toEqual(["cheap", "dear"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2]);
    expect(pointsOf(rows[0]!, "cost")).toBe(COMPARISON_WEIGHTS.cost);
    expect(pointsOf(rows[1]!, "cost")).toBeLessThan(COMPARISON_WEIGHTS.cost);
    expect(rows[0]!.badges).toContain("lowest_landed_cost");
    expect(rows[1]!.badges).not.toContain("lowest_landed_cost");
  });

  it("lets a high delivery fee change which offer is cheapest", () => {
    const rows = compareOffers(rfq, [offer("goods", 2900, 15, { deliveryFee: sar(4000) }), offer("landed", 3000, 15, { deliveryFee: sar(500) })], ctx);
    expect(rows[0]!.offerId).toBe("landed");
    expect(byId(rows, "landed").badges).toContain("lowest_landed_cost");
  });

  it("flags price against the benchmark", () => {
    const rows = compareOffers(rfq, [offer("low", 2700, 14), offer("mid", 3000, 15), offer("high", 3300, 16.5)], ctx);
    expect(byId(rows, "low").priceFlag).toBe("below_market");
    expect(byId(rows, "mid")).toMatchObject({ priceFlag: "in_line", vsBenchmarkPct: 0 });
    expect(byId(rows, "high")).toMatchObject({ priceFlag: "above_market", vsBenchmarkPct: 10 });
  });

  it("applies the 10% local-content preference to ranking only, never to the price paid", () => {
    const local = offer("local", 3100, 15.5, { localContent: true }); // 3.3% dearer on goods
    const rows = compareOffers(rfq, [offer("import", 3000, 15), local], ctx);
    const l = byId(rows, "local");
    expect(l.landedCostInclVat).toBe(sar(54_625)); // (46,500 + 1,000) x 1.15
    expect(l.evaluatedCost).toBe(sar(49_162.5));
    expect(l.rank).toBe(1);
    expect(byId(rows, "import").badges).toContain("lowest_landed_cost");
  });

  it("does not let a partial offer win on cost by supplying less", () => {
    const rows = compareOffers(rfq, [offer("partial", 3000, null), offer("full", 3000, 15)], ctx);
    const p = byId(rows, "partial");
    expect(rows[0]!.offerId).toBe("full");
    expect(p.coverage).toBe(0.67); // 30,000 of 45,000 benchmark value
    expect(p.linesCovered).toBe(1);
    expect(p.badges).toEqual([]);
    expect(pointsOf(p, "coverage")).toBeLessThan(COMPARISON_WEIGHTS.coverage);
  });

  it("prices a short line for the quantity available and lowers coverage", () => {
    const short = offer("short", 3000, 15);
    short.lines[0]!.quantityAvailable = 5;
    const [row] = compareOffers(rfq, [short], ctx);
    expect(row!.subtotal).toBe(sar(30_000));
    expect(row!.coverage).toBe(0.67);
    expect(row!.linesCovered).toBe(1);
  });

  it("checks lead time against the required-by date", () => {
    const rows = compareOffers(rfq, [offer("ok", 3000, 15, { leadTimeDays: 10 }), offer("late", 3000, 15, { leadTimeDays: 11 })], ctx);
    expect(byId(rows, "ok").meetsRequiredBy).toBe(true);
    expect(byId(rows, "late").meetsRequiredBy).toBe(false);
    expect(pointsOf(byId(rows, "late"), "lead_time")).toBe(0);
    expect(rows[0]!.offerId).toBe("ok");
  });

  it("uses supplier reliability and treats new suppliers neutrally", () => {
    const suppliers = [
      supplier("sup_good", {}, { onTimeRate: 0.97, fillRate: 0.98 }),
      supplier("sup_poor", {}, { onTimeRate: 0.8, fillRate: 0.85 }),
      supplier("sup_new", {}, { ordersCompleted: 2 }),
    ];
    const rows = compareOffers(rfq, [offer("good", 3000, 15), offer("poor", 3000, 15), offer("new", 3000, 15)], { ...ctx, suppliers });
    expect(rows[0]!.offerId).toBe("good");
    expect(byId(rows, "good").badges).toContain("most_reliable");
    expect(pointsOf(byId(rows, "new"), "reliability")).toBe(COMPARISON_WEIGHTS.reliability / 2);
    expect(pointsOf(byId(rows, "poor"), "reliability")).toBeLessThan(pointsOf(byId(rows, "new"), "reliability"));
  });

  it("awards fastest and best terms", () => {
    const rows = compareOffers(
      rfq,
      [offer("fast", 3000, 15, { leadTimeDays: 2, paymentTerms: { kind: "advance" } }), offer("terms", 3000, 15, { paymentTerms: { kind: "net", days: 90 } })],
      ctx,
    );
    expect(byId(rows, "fast").badges).toContain("fastest");
    expect(byId(rows, "fast").badges).not.toContain("best_terms");
    expect(byId(rows, "terms").badges).toContain("best_terms");
  });

  it("awards no badges to a single offer", () => {
    expect(compareOffers(rfq, [offer("only", 3000, 15)], ctx)[0]!.badges).toEqual([]);
  });

  it("explains every score: breakdown points sum to the score, each with a note", () => {
    const [row] = compareOffers(rfq, [offer("a", 3100, 15.2, { leadTimeDays: 7 }), offer("b", 3000, 15)], ctx);
    expect(row!.scoreBreakdown).toHaveLength(6);
    expect(row!.scoreBreakdown.reduce((s, p) => s + p.points, 0)).toBeCloseTo(row!.score, 5);
    expect(row!.scoreBreakdown.every((p) => p.note.length > 0)).toBe(true);
  });

  it("returns an empty list for no offers", () => {
    expect(compareOffers(rfq, [], ctx)).toEqual([]);
  });
});

describe("blindLabels", () => {
  it("labels by offer id, not by price or rank", () => {
    const offers = [offer("z-cheapest", 2500, 14), offer("a-dearest", 3500, 17)];
    const labels = blindLabels(offers);
    expect(labels.get(offers[0]!.id)).toBe("Supplier B");
    expect(labels.get(offers[1]!.id)).toBe("Supplier A");
  });

  it("continues past Z", () => {
    const many = Array.from({ length: 28 }, (_, i) => ({ id: `o${String(i).padStart(2, "0")}` as Offer["id"] }));
    const labels = [...blindLabels(many).values()];
    expect([labels[0], labels[25], labels[26], labels[27]]).toEqual(["Supplier A", "Supplier Z", "Supplier AA", "Supplier AB"]);
  });
});

describe("suggestBasketSplit", () => {
  it("suggests a split that beats the best single offer after the extra delivery fee", () => {
    // A is cheap on rebar, B is cheap on cement.
    const split = suggestBasketSplit(rfq, [offer("a", 2800, 18), offer("b", 3200, 14)]);
    // single A: (28,000 + 18,000 + 1,000) x 1.15 = 54,050; single B: (32,000 + 14,000 + 1,000) x 1.15 = 54,050
    // split: (28,000 + 1,000) x 1.15 + (14,000 + 1,000) x 1.15 = 33,350 + 17,250 = 50,600
    expect(split).not.toBeNull();
    expect(split!.totalInclVat).toBe(sar(50_600));
    expect(split!.bestSingleInclVat).toBe(sar(54_050));
    expect(split!.saving).toBe(sar(3450));
    expect(split!.allocations).toEqual([
      expect.objectContaining({ offerId: "a", rfqLineIds: ["rebar"], landedCostInclVat: sar(33_350) }),
      expect.objectContaining({ offerId: "b", rfqLineIds: ["cement"], landedCostInclVat: sar(17_250) }),
    ]);
  });

  it("returns null when the second delivery fee eats the saving", () => {
    expect(suggestBasketSplit(rfq, [offer("a", 3000, 15.2), offer("b", 3050, 15, { deliveryFee: sar(3000) })])).toBeNull();
  });

  it("returns null when the saving is below the minimum", () => {
    expect(suggestBasketSplit(rfq, [offer("a", 2800, 18), offer("b", 3200, 14)], { minSaving: sar(10_000) })).toBeNull();
  });

  it("builds a basket from partial offers when no single offer covers everything", () => {
    const split = suggestBasketSplit(rfq, [offer("a", 3000, null), offer("b", null, 15)]);
    expect(split!.allocations).toHaveLength(2);
    expect(split!.bestSingleOfferId).toBeNull();
    expect(split!.saving).toBeNull();
  });

  it("ignores lines a supplier cannot deliver in full", () => {
    const short = offer("a", 2000, 15);
    short.lines[0]!.quantityAvailable = 4;
    const split = suggestBasketSplit(rfq, [short, offer("b", 3000, null)]);
    expect(split!.allocations.find((x) => x.offerId === "b")!.rfqLineIds).toEqual(["rebar"]);
  });

  it("returns null when a line cannot be covered by anyone", () => {
    expect(suggestBasketSplit(rfq, [offer("a", 3000, null), offer("b", 3100, null)])).toBeNull();
  });

  it("respects the supplier limit", () => {
    const three: Rfq = { ...rfq, lines: [...rfq.lines, { id: "blocks", materialId: "mat_block" as MaterialId, description: "Block", spec: "SASO", quantity: 5000, unit: "piece" }] };
    const withBlocks = (o: Offer, priceSar: number): Offer => ({
      ...o,
      lines: [...o.lines, { rfqLineId: "blocks", unitPrice: sar(priceSar), quantityAvailable: 5000, stock: "in_stock", brand: "B", isAlternative: false }],
    });
    const offers = [withBlocks(offer("a", 2000, 20), 5), withBlocks(offer("b", 3000, 10), 5), withBlocks(offer("c", 3000, 20), 2)];
    expect(suggestBasketSplit(three, offers, { maxSuppliers: 3 })!.allocations).toHaveLength(3);
    expect(suggestBasketSplit(three, offers, { maxSuppliers: 2 })!.allocations).toHaveLength(2);
  });

  it("returns null with fewer than two offers", () => {
    expect(suggestBasketSplit(rfq, [offer("a", 3000, 15)])).toBeNull();
    expect(suggestBasketSplit(rfq, [])).toBeNull();
  });

  it("keeps supplier ids on allocations so a PO can be placed per supplier", () => {
    const split = suggestBasketSplit(rfq, [offer("a", 2800, 18), offer("b", 3200, 14)]);
    expect(split!.allocations.map((x) => x.supplierId)).toEqual(["sup_a" as OrgId, "sup_b" as OrgId]);
  });
});
