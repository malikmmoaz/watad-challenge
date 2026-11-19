import { describe, expect, it } from "vitest";
import { MAX_LINE_QUANTITY, quantityProblem, rfqDraftProblems } from "./rfq-draft";

describe("quantity edge cases", () => {
  it("rejects empty, zero, negative and non-finite quantities", () => {
    for (const q of [Number.NaN, 0, -1, -0.5, Infinity, -Infinity]) expect(quantityProblem(q, "tonne"), String(q)).toBe("missing");
  });

  it("caps very large quantities", () => {
    expect(quantityProblem(MAX_LINE_QUANTITY, "tonne")).toBeNull();
    expect(quantityProblem(MAX_LINE_QUANTITY + 1, "tonne")).toBe("tooLarge");
    expect(quantityProblem(1e15, "bag_50kg")).toBe("tooLarge");
  });

  it("allows decimals for measured units, not for things sold whole", () => {
    for (const unit of ["tonne", "m3", "m", "m2"] as const) expect(quantityProblem(12.5, unit), unit).toBeNull();
    for (const unit of ["bag_50kg", "piece", "roll"] as const) {
      expect(quantityProblem(1.5, unit), unit).toBe("notWhole");
      expect(quantityProblem(2, unit), unit).toBeNull();
    }
  });
});

describe("RFQ draft problems", () => {
  const ok = { lines: [{ quantity: 40, unit: "tonne" as const }], site: "Al Malqa Villas", requiredBy: "2026-12-20" };

  it("a complete draft has none", () => {
    expect(rfqDraftProblems(ok)).toEqual([]);
  });

  it("lists every problem once, in form order", () => {
    expect(
      rfqDraftProblems({
        lines: [
          { quantity: Number.NaN, unit: "tonne" },
          { quantity: 0, unit: "tonne" },
          { quantity: 5e6, unit: "m3" },
          { quantity: 2.5, unit: "bag_50kg" },
        ],
        site: "   ",
        requiredBy: "",
      }),
    ).toEqual(["needQuantity", "quantityTooLarge", "quantityWhole", "needSite", "needDate"]);
    expect(rfqDraftProblems({ ...ok, lines: [] })).toEqual(["needLine"]);
  });
});
