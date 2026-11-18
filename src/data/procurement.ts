/** SAMPLE DATA. Fictional RFQs, offers and purchase orders. */
import { add, inclVat, murabaha, sar, times, vatOn } from "@/domain/money";
import type {
  Halalas,
  MaterialId,
  Offer,
  OfferId,
  OfferLine,
  OrgId,
  PoId,
  PurchaseOrder,
  CreditCaseId,
  Rfq,
  RfqId,
  RfqLine,
  Unit,
} from "@/domain/types";
import { ADVANCE, CREDIT60, NET30, ON_DELIVERY } from "./orgs";

const org = (s: string) => s as OrgId;
const line = (id: string, materialId: string, description: string, spec: string, quantity: number, unit: Unit): RfqLine => ({
  id,
  materialId: materialId as MaterialId,
  description,
  spec,
  quantity,
  unit,
});
const ol = (rfqLineId: string, unitPriceSar: number, quantityAvailable: number, brand: string, extra: Partial<OfferLine> = {}): OfferLine => ({
  rfqLineId,
  unitPrice: sar(unitPriceSar),
  quantityAvailable,
  stock: "in_stock",
  brand,
  isAlternative: false,
  ...extra,
});

export const rfqs: Rfq[] = [
  {
    id: "rfq_1042" as RfqId,
    contractorId: org("con_najd"),
    projectId: "prj_school",
    title: "Structure package — Block C slabs and columns",
    source: "upload",
    sourceFileName: "BOQ-AlNarjis-BlockC-structure.xlsx",
    status: "offers_received",
    lines: [
      { ...line("l1", "mat_rebar_16", "Deformed rebar 16 mm", "SASO ASTM A615 Grade 60, 12 m lengths", 85, "tonne"), parsedBy: { simulated: true, agent: "BOQ reader", confidence: 0.97 } },
      { ...line("l2", "mat_rebar_12", "Deformed rebar 12 mm", "SASO ASTM A615 Grade 60, 12 m lengths", 40, "tonne"), parsedBy: { simulated: true, agent: "BOQ reader", confidence: 0.95 } },
      { ...line("l3", "mat_cement_opc", "Ordinary Portland Cement, 50 kg bag", "SASO GSO 1914 CEM I 42.5N", 3200, "bag_50kg"), parsedBy: { simulated: true, agent: "BOQ reader", confidence: 0.91 } },
    ],
    deliveryCity: "Riyadh",
    deliverySite: "Al Narjis Schools Complex, Gate 2, Riyadh",
    requiredBy: "2026-12-02",
    closesAt: "2026-11-21T14:00:00Z",
    preferredTerms: CREDIT60,
    wantsCredit: true,
    invitedSupplierIds: [org("sup_rawasi"), org("sup_sawari"), org("sup_khaleej")],
    blindComparison: false,
    createdAt: "2026-11-16T08:12:00Z",
    notes: "Deliver in two drops. Mill test certificates required with each rebar delivery.",
  },
  {
    id: "rfq_1043" as RfqId,
    contractorId: org("con_najd"),
    projectId: "prj_villas",
    title: "Electrical first fix — villas 1 to 12",
    source: "catalog",
    status: "sent",
    lines: [
      line("l1", "mat_cable_4c16", "LV power cable 4C × 16 mm² Cu/XLPE/PVC", "IEC 60502-1, 0.6/1 kV", 2400, "m"),
      line("l2", "mat_wire_2_5", "Building wire 2.5 mm² (100 m roll)", "SASO IEC 60227, 450/750 V", 180, "roll"),
    ],
    deliveryCity: "Riyadh",
    deliverySite: "Al Malqa Villas, Plot 14, Riyadh",
    requiredBy: "2026-12-10",
    closesAt: "2026-11-24T14:00:00Z",
    preferredTerms: NET30,
    wantsCredit: false,
    invitedSupplierIds: [org("sup_tayf"), org("sup_khaleej")],
    blindComparison: true,
    createdAt: "2026-11-18T06:40:00Z",
  },
  {
    // Open request waiting for the demo supplier's offer, so the supplier portal has work on day one.
    id: "rfq_1044" as RfqId,
    contractorId: org("con_najd"),
    projectId: "prj_villas",
    title: "Villas 13 to 24: ground floor slabs",
    source: "catalog",
    status: "sent",
    lines: [
      line("l1", "mat_rebar_12", "Deformed rebar 12 mm", "SASO ASTM A615 Grade 60, 12 m lengths", 24, "tonne"),
      line("l2", "mat_cement_opc", "Ordinary Portland Cement (OPC), 50 kg bag", "SASO GSO 1914 CEM I 42.5N", 1800, "bag_50kg"),
    ],
    deliveryCity: "Riyadh",
    deliverySite: "Al Malqa Villas, Plot 14, Riyadh",
    requiredBy: "2026-12-14",
    closesAt: "2026-11-26T14:00:00Z",
    preferredTerms: CREDIT60,
    wantsCredit: true,
    invitedSupplierIds: [org("sup_rawasi"), org("sup_sawari"), org("sup_nakheel")],
    blindComparison: false,
    createdAt: "2026-11-18T09:15:00Z",
  },
  {
    id: "rfq_1038" as RfqId,
    contractorId: org("con_najd"),
    projectId: "prj_school",
    title: "Ready-mix for raft foundation — Block B",
    source: "catalog",
    status: "awarded",
    lines: [line("l1", "mat_readymix_c40", "Ready-mix concrete C40 (SRC)", "C40/50, SRC, 20 mm aggregate, pumpable", 620, "m3")],
    deliveryCity: "Riyadh",
    deliverySite: "Al Narjis Schools Complex, Gate 1, Riyadh",
    requiredBy: "2026-11-12",
    closesAt: "2026-11-05T14:00:00Z",
    preferredTerms: CREDIT60,
    wantsCredit: true,
    invitedSupplierIds: [org("sup_sahra")],
    blindComparison: false,
    createdAt: "2026-11-02T09:05:00Z",
  },
  {
    id: "rfq_1040" as RfqId,
    contractorId: org("con_hijaz"),
    projectId: "prj_clinic",
    title: "Finishes — flooring and partitions",
    source: "upload",
    sourceFileName: "Obhur-clinic-finishes-BOQ.pdf",
    status: "offers_received",
    lines: [
      line("l1", "mat_tile_porcelain_60", "Porcelain floor tile 60 × 60 cm", "ISO 13006 BIa, matt, rectified, PEI 4", 1850, "m2"),
      line("l2", "mat_gypsum_12_5", "Gypsum board 12.5 mm, 1.2 × 2.4 m", "ASTM C1396 regular, tapered edge", 940, "piece"),
    ],
    deliveryCity: "Jeddah",
    deliverySite: "Obhur Primary Care Clinic, Jeddah",
    requiredBy: "2026-12-05",
    closesAt: "2026-11-22T14:00:00Z",
    preferredTerms: ON_DELIVERY,
    wantsCredit: false,
    invitedSupplierIds: [org("sup_dana"), org("sup_khaleej")],
    blindComparison: false,
    createdAt: "2026-11-15T11:30:00Z",
  },
];

export const offers: Offer[] = [
  {
    id: "off_2101" as OfferId,
    rfqId: "rfq_1042" as RfqId,
    supplierId: org("sup_rawasi"),
    status: "submitted",
    lines: [ol("l1", 3460, 85, "Hadeed (SABIC)"), ol("l2", 3490, 40, "Hadeed (SABIC)"), ol("l3", 15.6, 3200, "Yamama Cement")],
    deliveryFee: sar(4200),
    leadTimeDays: 4,
    paymentTerms: CREDIT60,
    localContent: true,
    validUntil: "2026-11-28",
    submittedAt: "2026-11-16T13:02:00Z",
    notes: "Mill certificates included. Two drops as requested.",
  },
  {
    id: "off_2102" as OfferId,
    rfqId: "rfq_1042" as RfqId,
    supplierId: org("sup_sawari"),
    status: "submitted",
    lines: [
      ol("l1", 3395, 85, "Al Ittefaq Steel"),
      ol("l2", 3430, 28, "Al Ittefaq Steel", { stock: "partial" }),
      ol("l3", 15.95, 3200, "Saudi Cement"),
    ],
    deliveryFee: sar(5600),
    leadTimeDays: 7,
    paymentTerms: CREDIT60,
    localContent: true,
    validUntil: "2026-11-25",
    submittedAt: "2026-11-17T07:44:00Z",
    notes: "12 mm: 28 t in stock, balance in 10 days.",
  },
  {
    id: "off_2103" as OfferId,
    rfqId: "rfq_1042" as RfqId,
    supplierId: org("sup_khaleej"),
    status: "submitted",
    lines: [
      ol("l1", 3240, 85, "Imported (Türkiye)", { isAlternative: true, alternativeNote: "BS 4449 B500B offered as equivalent to ASTM A615 Gr 60" }),
      ol("l2", 3270, 40, "Imported (Türkiye)", { isAlternative: true, alternativeNote: "BS 4449 B500B offered as equivalent to ASTM A615 Gr 60" }),
      ol("l3", 15.2, 3200, "Imported clinker blend", { stock: "made_to_order" }),
    ],
    deliveryFee: sar(9800),
    leadTimeDays: 16,
    paymentTerms: ADVANCE,
    localContent: false,
    validUntil: "2026-11-23",
    submittedAt: "2026-11-17T15:20:00Z",
  },
  {
    id: "off_2090" as OfferId,
    rfqId: "rfq_1038" as RfqId,
    supplierId: org("sup_sahra"),
    status: "awarded",
    lines: [ol("l1", 258, 620, "Sahra batching plant, Riyadh North")],
    deliveryFee: sar(0),
    leadTimeDays: 2,
    paymentTerms: CREDIT60,
    localContent: true,
    validUntil: "2026-11-10",
    submittedAt: "2026-11-03T10:15:00Z",
    notes: "Pump included. Night pours available.",
  },
  {
    id: "off_2110" as OfferId,
    rfqId: "rfq_1040" as RfqId,
    supplierId: org("sup_dana"),
    status: "submitted",
    lines: [ol("l1", 33.5, 1850, "Saudi Ceramics"), ol("l2", 23.9, 940, "National Gypsum")],
    deliveryFee: sar(1900),
    leadTimeDays: 5,
    paymentTerms: NET30,
    localContent: true,
    validUntil: "2026-11-30",
    submittedAt: "2026-11-16T09:10:00Z",
  },
  {
    id: "off_2111" as OfferId,
    rfqId: "rfq_1040" as RfqId,
    supplierId: org("sup_khaleej"),
    status: "submitted",
    lines: [ol("l1", 29.8, 1850, "Imported porcelain (India)"), ol("l2", 25.4, 600, "Imported", { stock: "partial" })],
    deliveryFee: sar(6400),
    leadTimeDays: 21,
    paymentTerms: ADVANCE,
    localContent: false,
    validUntil: "2026-11-26",
    submittedAt: "2026-11-17T12:00:00Z",
  },
];

/** Subtotal of an offer against its RFQ quantities (capped at what the supplier can supply). */
export function offerSubtotal(offer: Offer, rfq: Rfq): Halalas {
  return add(
    ...offer.lines.map((l) => {
      const requested = rfq.lines.find((r) => r.id === l.rfqLineId)?.quantity ?? 0;
      return times(l.unitPrice, Math.min(requested, l.quantityAvailable));
    }),
  );
}

const po1038 = (() => {
  const rfq = rfqs.find((r) => r.id === "rfq_1038")!;
  const offer = offers.find((o) => o.id === "off_2090")!;
  const subtotal = offerSubtotal(offer, rfq);
  const net = add(subtotal, offer.deliveryFee);
  const totalInclVat = inclVat(net);
  const m = murabaha(totalInclVat, 0.03, 60);
  const po: PurchaseOrder = {
    id: "po_3007" as PoId,
    rfqId: rfq.id,
    offerId: offer.id,
    contractorId: rfq.contractorId,
    supplierId: offer.supplierId,
    status: "delivered",
    timeline: [
      { status: "placed", at: "2026-11-06T08:30:00Z", actor: "contractor" },
      { status: "confirmed", at: "2026-11-06T09:10:00Z", actor: "supplier", note: "Pour scheduled 11 Nov, 22:00" },
      { status: "dispatched", at: "2026-11-11T19:00:00Z", actor: "supplier" },
      { status: "delivered", at: "2026-11-12T04:40:00Z", actor: "contractor", note: "620 m³ received, cube samples taken" },
    ],
    subtotal,
    deliveryFee: offer.deliveryFee,
    vat: vatOn(net),
    totalInclVat,
    paymentMethod: "platform_credit",
    creditDraw: {
      poId: "po_3007" as PoId,
      creditCaseId: "cc_501" as CreditCaseId,
      principal: totalInclVat,
      tenorDays: 60,
      profitRate: 0.03,
      markup: m.markup,
      apr: m.apr,
      totalRepayable: m.totalRepayable,
      dueDate: "2027-01-05",
      supplierPaidAt: "2026-11-13T10:00:00Z",
    },
    expectedDelivery: "2026-11-12",
    placedAt: "2026-11-06T08:30:00Z",
  };
  return po;
})();

export const purchaseOrders: PurchaseOrder[] = [po1038];
