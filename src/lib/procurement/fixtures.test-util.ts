/** Test fixtures for the procurement logic. Fictional data only. */
import { sar } from "@/domain/money";
import type { Material, MaterialId, Offer, OfferId, OrgId, PaymentTerms, Rfq, RfqId, Supplier } from "@/domain/types";

export const NET30: PaymentTerms = { kind: "net", days: 30 };

export const materials: Material[] = [
  { id: "mat_rebar" as MaterialId, category: "rebar_steel", name: "Rebar 16 mm", spec: "Grade 60", unit: "tonne", benchmarkUnitPrice: sar(3000), benchmarkSource: "test", brands: [] },
  { id: "mat_cement" as MaterialId, category: "cement", name: "OPC 50 kg", spec: "CEM I", unit: "bag_50kg", benchmarkUnitPrice: sar(15), benchmarkSource: "test", brands: [] },
  { id: "mat_block" as MaterialId, category: "blocks_aggregates", name: "Block 20 cm", spec: "SASO", unit: "piece", benchmarkUnitPrice: sar(3), benchmarkSource: "test", brands: [] },
];

/** 10 t rebar (SAR 30,000) + 1,000 bags cement (SAR 15,000) = SAR 45,000 at benchmark, SAR 51,750 incl. VAT. */
export const rfq: Rfq = {
  id: "rfq_1" as RfqId,
  contractorId: "con_1" as OrgId,
  projectId: "prj_1",
  title: "Structure package",
  source: "catalog",
  status: "sent",
  lines: [
    { id: "rebar", materialId: "mat_rebar" as MaterialId, description: "Rebar 16 mm", spec: "Grade 60", quantity: 10, unit: "tonne" },
    { id: "cement", materialId: "mat_cement" as MaterialId, description: "OPC 50 kg", spec: "CEM I", quantity: 1000, unit: "bag_50kg" },
  ],
  deliveryCity: "Riyadh",
  deliverySite: "Al Narjis",
  requiredBy: "2026-12-10T00:00:00Z",
  closesAt: "2026-12-02T00:00:00Z",
  preferredTerms: NET30,
  wantsCredit: true,
  invitedSupplierIds: [],
  blindComparison: false,
  createdAt: "2026-11-30T00:00:00Z",
};

/** 10 days before `rfq.requiredBy`. */
export const today = "2026-11-30T00:00:00Z";

export const supplier = (id: string, over: Partial<Supplier> = {}, perf: Partial<Supplier["performance"]> = {}): Supplier => ({
  id: id as OrgId,
  kind: "supplier",
  name: `Supplier ${id}`,
  city: "Riyadh",
  categories: ["rebar_steel", "cement"],
  brandsStocked: [],
  serviceCities: ["Riyadh"],
  localContent: true,
  vetted: true,
  performance: { onTimeRate: 0.9, fillRate: 0.95, ordersCompleted: 100, avgResponseHours: 6, disputeRate: 0.02, ...perf },
  acceptedTerms: [NET30],
  acceptsPlatformCredit: true,
  ...over,
});

/** Offer priced in SAR per unit; pass null to leave a line out. */
export const offer = (id: string, rebarSar: number | null, cementSar: number | null, over: Partial<Offer> = {}): Offer => ({
  id: id as OfferId,
  rfqId: rfq.id,
  supplierId: `sup_${id}` as OrgId,
  status: "submitted",
  lines: [
    ...(rebarSar === null ? [] : [{ rfqLineId: "rebar", unitPrice: sar(rebarSar), quantityAvailable: 10, stock: "in_stock" as const, brand: "B", isAlternative: false }]),
    ...(cementSar === null ? [] : [{ rfqLineId: "cement", unitPrice: sar(cementSar), quantityAvailable: 1000, stock: "in_stock" as const, brand: "B", isAlternative: false }]),
  ],
  deliveryFee: sar(1000),
  leadTimeDays: 5,
  paymentTerms: NET30,
  localContent: false,
  validUntil: "2026-12-05T00:00:00Z",
  submittedAt: today,
  ...over,
});
