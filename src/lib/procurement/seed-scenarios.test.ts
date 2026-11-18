import { describe, expect, it } from "vitest";
import { offers, rfqs } from "@/data";
import { sar } from "@/domain/money";
import { suggestBasketSplit } from "./comparison";

// The demo relies on these sample-data scenarios; keep them true when editing the seed.
describe("seed scenarios", () => {
  it("rfq_1045 suggests a basket split across the two specialists", () => {
    const rfq = rfqs.find((r) => r.id === "rfq_1045")!;
    const split = suggestBasketSplit(rfq, offers.filter((o) => o.rfqId === rfq.id));
    // Single offer (Nakheel): (30 x 3,450 + 12,000 x 2.70 + 1,800) x 1.15 = 158,355
    // Split: Sawari rebar (99,900 + 2,000) x 1.15 + Sahra blocks (28,200 + 900) x 1.15 = 150,650
    expect(split).not.toBeNull();
    expect(split!.allocations.map((a) => [a.supplierId, a.rfqLineIds])).toEqual([
      ["sup_sawari", ["l1"]],
      ["sup_sahra", ["l2"]],
    ]);
    expect(split!.bestSingleInclVat).toBe(sar(158_355));
    expect(split!.totalInclVat).toBe(sar(150_650));
    expect(split!.saving).toBe(sar(7705));
  });

  it("rfq_1044 is open for the demo supplier's offer", () => {
    const rfq = rfqs.find((r) => r.id === "rfq_1044")!;
    expect(rfq.status).toBe("sent");
    expect(rfq.invitedSupplierIds).toContain("sup_rawasi");
    expect(offers.some((o) => o.rfqId === "rfq_1044")).toBe(false);
  });
});
