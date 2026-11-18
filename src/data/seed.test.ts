import { describe, expect, it } from "vitest";
import { reference, seedState } from "./index";

const supplierIds = new Set(reference.suppliers.map((s) => s.id));
const contractorIds = new Set(reference.contractors.map((c) => c.id));
const materialIds = new Set(reference.materials.map((m) => m.id));

describe("seed data integrity", () => {
  it("RFQs reference known contractors, suppliers and materials", () => {
    for (const rfq of seedState.rfqs) {
      expect(contractorIds.has(rfq.contractorId)).toBe(true);
      rfq.invitedSupplierIds.forEach((id) => expect(supplierIds.has(id)).toBe(true));
      rfq.lines.forEach((l) => expect(materialIds.has(l.materialId)).toBe(true));
    }
  });
  it("offers reference known RFQs, lines and invited suppliers", () => {
    for (const offer of seedState.offers) {
      const rfq = seedState.rfqs.find((r) => r.id === offer.rfqId);
      expect(rfq).toBeDefined();
      expect(rfq!.invitedSupplierIds).toContain(offer.supplierId);
      offer.lines.forEach((l) => expect(rfq!.lines.some((r) => r.id === l.rfqLineId)).toBe(true));
    }
  });
  it("PO totals add up and credit draws match", () => {
    for (const po of seedState.purchaseOrders) {
      expect(po.totalInclVat).toBe(po.subtotal + po.deliveryFee + po.vat);
      if (po.creditDraw) expect(po.creditDraw.totalRepayable).toBe(po.creditDraw.principal + po.creditDraw.markup);
    }
  });
  it("scorecards sum to their total and weights sum to 100", () => {
    for (const c of seedState.creditCases) {
      if (!c.scorecard) continue;
      expect(c.scorecard.factors.reduce((a, f) => a + f.weight, 0)).toBe(100);
      expect(c.scorecard.factors.reduce((a, f) => a + f.points, 0)).toBe(c.scorecard.total);
    }
  });
  it("evidence points at real extracted fields", () => {
    for (const c of seedState.creditCases) {
      const refs = [...c.gates.flatMap((g) => g.evidence), ...(c.scorecard?.factors.flatMap((f) => f.evidence) ?? [])];
      for (const ref of refs) {
        const doc = c.documents.find((d) => d.id === ref.documentId);
        expect(doc?.extracted.some((f) => f.key === ref.fieldKey), `${ref.documentId}.${ref.fieldKey}`).toBe(true);
      }
    }
  });
  it("facilities: available = cap - drawn, within cap", () => {
    for (const fac of seedState.creditFacilities) {
      expect(fac.available).toBe(fac.cap - fac.drawn);
      expect(fac.drawn).toBeLessThanOrEqual(fac.cap);
    }
  });
});
