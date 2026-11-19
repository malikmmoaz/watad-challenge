import { describe, expect, it } from "vitest";
import { creditFacilities, offers, purchaseOrders, rfqs } from "@/data";
import { supplierNextStep } from "./supplier-offer";
import { sar } from "@/domain/money";
import { suggestBasketSplit } from "./comparison";

// The demo relies on these sample-data scenarios; keep them true when editing the seed.
describe("seed scenarios", () => {
  it("rfq_1045 suggests a basket split across the two specialists", () => {
    const rfq = rfqs.find((r) => r.id === "rfq_1045")!;
    const split = suggestBasketSplit(rfq, offers.filter((o) => o.rfqId === rfq.id));
    // Single offer (Nakheel): (30 x 2,945 + 12,000 x 2.70 + 1,800) x 1.15 = 140,932.50
    // Split: Sawari rebar (85,350 + 2,000) x 1.15 + Sahra blocks (28,200 + 900) x 1.15 = 133,917.50
    expect(split).not.toBeNull();
    expect(split!.allocations.map((a) => [a.supplierId, a.rfqLineIds])).toEqual([
      ["sup_sawari", ["l1"]],
      ["sup_sahra", ["l2"]],
    ]);
    expect(split!.bestSingleInclVat).toBe(sar(140_932.5));
    expect(split!.totalInclVat).toBe(sar(133_917.5));
    expect(split!.saving).toBe(sar(7015));
  });

  it("rfq_1044 is open for the demo supplier's offer", () => {
    const rfq = rfqs.find((r) => r.id === "rfq_1044")!;
    expect(rfq.status).toBe("sent");
    expect(rfq.invitedSupplierIds).toContain("sup_rawasi");
    expect(offers.some((o) => o.rfqId === "rfq_1044")).toBe(false);
  });

  it("the demo supplier opens on a won PO to dispatch, drawn on the contractor's cap", () => {
    const po = purchaseOrders.find((p) => p.supplierId === "sup_rawasi")!;
    expect(po).toMatchObject({ id: "po_3011", rfqId: "rfq_1039", status: "confirmed", paymentMethod: "platform_credit" });
    expect(supplierNextStep(po)).toEqual({ text: "Mark as dispatched", yours: true });
    expect(rfqs.find((r) => r.id === "rfq_1039")!.status).toBe("awarded");
    expect(offers.find((o) => o.id === po.offerId)!.status).toBe("awarded");
    // The facility's drawn amount includes every unrepaid seeded draw, and the open comparison
    // on rfq_1042 (Rawasi, SAR 488,169.25) still fits what is left of the cap.
    const facility = creditFacilities.find((f) => f.contractorId === "con_najd")!;
    const drawn = purchaseOrders.filter((p) => p.creditDraw && !p.creditDraw.repaidAt).reduce((s, p) => s + p.creditDraw!.principal, 0);
    expect(facility.drawn).toBe(drawn);
    expect(facility.cap - facility.drawn).toBeGreaterThanOrEqual(sar(488_169.25));
  });
});
