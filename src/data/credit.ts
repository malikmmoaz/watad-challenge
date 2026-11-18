/**
 * SAMPLE DATA. Fictional credit cases. Every AI output here is simulated and
 * carries `ai.simulated: true`; the UI must label it.
 */
import { sar } from "@/domain/money";
import type {
  CreditCase,
  CreditCaseId,
  CreditDocument,
  CreditDocumentType,
  CreditFacility,
  DocumentId,
  DocumentStatus,
  ExtractedField,
  OrgId,
  SimulatedAi,
} from "@/domain/types";
import { purchaseOrders } from "./procurement";

const org = (s: string) => s as OrgId;
const did = (s: string) => s as DocumentId;
const ai = (agent: string, confidence: number): SimulatedAi => ({ simulated: true, agent, confidence });
const f = (key: string, label: string, value: string, location: string, confidence = 0.96): ExtractedField => ({ key, label, value, location, confidence });
const doc = (
  id: string,
  type: CreditDocumentType,
  fileName: string,
  status: DocumentStatus,
  period: string,
  extracted: ExtractedField[] = [],
): CreditDocument => ({ id: did(id), type, fileName, status, uploadedAt: status === "missing" ? undefined : "2026-10-20T09:00:00Z", period, extracted, findings: [] });

const najdDocs: CreditDocument[] = [
  doc("d_najd_cr", "cr", "CR-Najd-Horizon.pdf", "verified", "valid to 2027-08-30", [
    f("cr_number", "CR number", "1010XXXX41", "p.1, header"),
    f("cr_status", "Status", "Active", "p.1, status box"),
    f("cr_capital", "Paid-up capital", "SAR 5,000,000", "p.1, capital"),
  ]),
  doc("d_najd_vat", "vat_returns", "ZATCA-VAT-returns-Q4-2025-to-Q3-2026.pdf", "verified", "Q4 2025 – Q3 2026", [
    f("vat_revenue_12m", "Declared taxable sales, last 4 quarters", "SAR 61,400,000", "Returns 1–4, box 1 total"),
  ]),
  doc("d_najd_bank", "bank_statements", "Bank-statements-12m.pdf", "verified", "Oct 2025 – Sep 2026", [
    f("bank_inflows_12m", "Total inflows, 12 months", "SAR 59,900,000", "Monthly summary, all pages", 0.93),
    f("bank_avg_balance", "Average daily balance", "SAR 3,150,000", "Computed from daily balances", 0.93),
    f("bank_returned_items", "Returned payments", "0", "Transaction scan, all pages", 0.9),
  ]),
  doc("d_najd_fin", "audited_financials", "Qawaem-audited-FY2025.pdf", "verified", "FY2025", [
    f("fin_revenue", "Revenue", "SAR 58,700,000", "p.5, Income statement, line 1"),
    f("fin_net_profit", "Net profit", "SAR 3,820,000", "p.5, Income statement, line 22"),
    f("fin_current_assets", "Current assets", "SAR 24,600,000", "p.4, Balance sheet, line 9"),
    f("fin_current_liabilities", "Current liabilities", "SAR 15,100,000", "p.4, Balance sheet, line 21"),
    f("fin_net_worth", "Total equity", "SAR 18,900,000", "p.4, Balance sheet, line 30"),
    f("fin_total_debt", "Total borrowings", "SAR 6,200,000", "p.12, Note 14"),
  ]),
  doc("d_najd_simah", "simah_report", "SIMAH-commercial-report.pdf", "verified", "issued 2026-10-12", [
    f("simah_facilities", "Active facilities", "3", "Section 2, summary"),
    f("simah_defaults", "Defaults, last 24 months", "0", "Section 4"),
    f("simah_late_30", "Payments 30+ days late, last 24 months", "1", "Section 4, table 2"),
  ]),
  doc("d_najd_zakat", "zakat_certificate", "Zakat-certificate-2026.pdf", "verified", "valid to 2027-04-30"),
  doc("d_najd_gosi", "gosi_certificate", "GOSI-certificate.pdf", "verified", "issued 2026-10-01", [
    f("gosi_headcount", "Registered employees", "212", "p.1, summary"),
    f("gosi_nitaqat", "Nitaqat band", "Medium Green", "p.1, summary"),
  ]),
  doc("d_najd_class", "classification_certificate", "Contractor-classification.pdf", "verified", "valid to 2028-01-15", [
    f("class_grade", "Buildings grade", "Grade 3", "p.1"),
  ]),
];
najdDocs[1]!.findings.push({
  severity: "info",
  kind: "consistent",
  text: "VAT-declared sales (SAR 61.4M) are within 2.5% of bank inflows (SAR 59.9M) for the same period.",
  relatedDocumentIds: [did("d_najd_bank")],
  ai: ai("Cross-document checker", 0.92),
});

const hijazDocs: CreditDocument[] = [
  doc("d_hijaz_cr", "cr", "CR-Hijaz-Peaks.pdf", "verified", "valid to 2027-02-11", [f("cr_number", "CR number", "4030XXXX87", "p.1, header"), f("cr_status", "Status", "Active", "p.1, status box")]),
  doc("d_hijaz_vat", "vat_returns", "VAT-returns-4-quarters.pdf", "flagged", "Q4 2025 – Q3 2026", [
    f("vat_revenue_12m", "Declared taxable sales, last 4 quarters", "SAR 14,800,000", "Returns 1–4, box 1 total"),
  ]),
  doc("d_hijaz_bank", "bank_statements", "Bank-statements-6m.pdf", "flagged", "Apr 2026 – Sep 2026", [
    f("bank_inflows_6m", "Total inflows, 6 months", "SAR 4,900,000", "Monthly summary", 0.9),
    f("bank_returned_items", "Returned payments", "2", "p.7 and p.19", 0.88),
  ]),
  doc("d_hijaz_fin", "audited_financials", "Financial-statements-FY2025.pdf", "parsed", "FY2025", [
    f("fin_revenue", "Revenue", "SAR 13,900,000", "p.4, Income statement, line 1"),
    f("fin_current_assets", "Current assets", "SAR 5,200,000", "p.3, Balance sheet, line 8"),
    f("fin_current_liabilities", "Current liabilities", "SAR 4,700,000", "p.3, Balance sheet, line 19"),
    f("fin_net_worth", "Total equity", "SAR 2,300,000", "p.3, Balance sheet, line 27"),
  ]),
  doc("d_hijaz_simah", "simah_report", "", "missing", "not provided"),
  doc("d_hijaz_zakat", "zakat_certificate", "Zakat-certificate.pdf", "flagged", "expired 30 Sep 2026"),
  doc("d_hijaz_gosi", "gosi_certificate", "GOSI-certificate.pdf", "verified", "issued 2026-10-05", [f("gosi_headcount", "Registered employees", "38", "p.1, summary")]),
  doc("d_hijaz_class", "classification_certificate", "Classification.pdf", "verified", "valid to 2027-06-01", [f("class_grade", "Buildings grade", "Grade 4", "p.1")]),
];
hijazDocs[1]!.findings.push({
  severity: "warning",
  kind: "cross_document_mismatch",
  text: "VAT-declared sales annualise to SAR 14.8M but 6-month bank inflows annualise to about SAR 9.8M: a 34% gap. Ask for the second bank account or an explanation.",
  relatedDocumentIds: [did("d_hijaz_bank")],
  ai: ai("Cross-document checker", 0.86),
});
hijazDocs[5]!.findings.push({
  severity: "warning",
  kind: "expired",
  text: "Zakat certificate expired on 30 Sep 2026. A renewed certificate is required.",
  relatedDocumentIds: [],
  ai: ai("Document reader", 0.98),
});

export const creditCases: CreditCase[] = [
  {
    id: "cc_501" as CreditCaseId,
    contractorId: org("con_najd"),
    status: "approved",
    requestedCap: sar(2_000_000),
    requestedTenorDays: 60,
    purpose: "Materials for Al Narjis Schools Complex and Al Malqa villas",
    documents: najdDocs,
    gates: [
      { id: "cr", order: 1, label: "Commercial Registration", result: "pass", detail: "Active CR, owners match application.", evidence: [{ documentId: did("d_najd_cr"), fieldKey: "cr_status" }] },
      { id: "vat", order: 2, label: "ZATCA VAT returns", result: "pass", detail: "Four quarters filed on time.", evidence: [{ documentId: did("d_najd_vat"), fieldKey: "vat_revenue_12m" }] },
      { id: "bank", order: 3, label: "Bank statements", result: "pass", detail: "12 months, no returned payments.", evidence: [{ documentId: did("d_najd_bank"), fieldKey: "bank_returned_items" }] },
      { id: "financials", order: 4, label: "Audited financials (Qawaem)", result: "pass", detail: "Unqualified audit opinion, FY2025.", evidence: [{ documentId: did("d_najd_fin"), fieldKey: "fin_net_profit" }] },
      { id: "simah", order: 5, label: "SIMAH commercial report", result: "flag", detail: "One payment 30+ days late in 24 months; no defaults.", evidence: [{ documentId: did("d_najd_simah"), fieldKey: "simah_late_30" }] },
    ],
    scorecard: {
      factors: [
        { id: "liquidity", label: "Liquidity / working capital", weight: 15, points: 12, whyItMatters: "Absorbs late payment from the project owner.", rationale: "Current ratio 1.63; working capital SAR 9.5M.", evidence: [{ documentId: did("d_najd_fin"), fieldKey: "fin_current_assets" }, { documentId: did("d_najd_fin"), fieldKey: "fin_current_liabilities" }] },
        { id: "payment_history", label: "Payment history (SIMAH + on-platform)", weight: 15, points: 12, whyItMatters: "Most direct predictor of paying trade credit.", rationale: "No defaults; one 30+ day late payment; on-platform POs paid on time.", evidence: [{ documentId: did("d_najd_simah"), fieldKey: "simah_late_30" }] },
        { id: "payer_quality", label: "Payer quality", weight: 12, points: 10, whyItMatters: "Payer delays pass down to the contractor.", rationale: "70% of backlog paid by a government entity (60–70 day cycle).", evidence: [] },
        { id: "leverage_profitability", label: "Leverage and profitability", weight: 10, points: 8, whyItMatters: "Thin fixed-price margins drive defaults.", rationale: "Debt to equity 0.33; net margin 6.5%.", evidence: [{ documentId: did("d_najd_fin"), fieldKey: "fin_total_debt" }, { documentId: did("d_najd_fin"), fieldKey: "fin_net_profit" }] },
        { id: "backlog_capacity", label: "Backlog vs capacity", weight: 10, points: 7, whyItMatters: "Over-extension is a classic failure mode.", rationale: "Backlog SAR 69.7M is 1.2× annual revenue; headcount 212.", evidence: [{ documentId: did("d_najd_gosi"), fieldKey: "gosi_headcount" }] },
        { id: "wip_health", label: "WIP health", weight: 10, points: 7, whyItMatters: "Underbilling and profit fade hide losses.", rationale: "No WIP schedule supplied; inferred from accounts.", evidence: [] },
        { id: "bank_cashflow", label: "Bank cash-flow behaviour", weight: 10, points: 9, whyItMatters: "Bounced payments and volatile inflows signal stress.", rationale: "No returned items; average balance SAR 3.15M.", evidence: [{ documentId: did("d_najd_bank"), fieldKey: "bank_avg_balance" }] },
        { id: "concentration", label: "Concentration", weight: 8, points: 4, whyItMatters: "Reliance on one project or payer.", rationale: "Two projects; the larger is 70% of backlog.", evidence: [] },
        { id: "track_record", label: "Track record + classification", weight: 5, points: 4, whyItMatters: "Experience and certified project size.", rationale: "11 years; Buildings Grade 3.", evidence: [{ documentId: did("d_najd_class"), fieldKey: "class_grade" }] },
        { id: "compliance", label: "Compliance and disputes", weight: 5, points: 5, whyItMatters: "Zakat, GOSI and Saudization standing.", rationale: "Zakat valid; Nitaqat Medium Green.", evidence: [{ documentId: did("d_najd_gosi"), fieldKey: "gosi_nitaqat" }] },
      ],
      total: 78,
      band: "B",
      policyChecks: [
        { id: "dscr", rule: "Debt-service cover ≥ 1.3", observed: "1.9", result: "pass" },
        { id: "exposure", rule: "Exposure above SAR 500,000 is referred to a senior manager", observed: "SAR 1,500,000 proposed", result: "refer" },
        { id: "vat_bank_gap", rule: "VAT sales vs bank inflows gap ≤ 15%", observed: "2.5%", result: "pass" },
      ],
      topFactors: [
        { factorId: "liquidity", direction: "up" },
        { factorId: "bank_cashflow", direction: "up" },
        { factorId: "concentration", direction: "down" },
      ],
      proposedCap: sar(1_500_000),
      capBasis: [
        { method: "10% of net worth", amount: sar(1_890_000) },
        { method: "10% of working capital", amount: sar(950_000) },
        { method: "Monthly purchases × (60 ÷ 30)", amount: sar(2_400_000) },
        { method: "Band B adjustment and platform history", amount: sar(1_500_000) },
      ],
    },
    aiProposal: {
      outcome: "approve",
      proposedCap: sar(1_500_000),
      reasonCodes: ["strong_liquidity", "clean_payment_history", "payer_concentration"],
      memo: "**Recommendation: approve SAR 1,500,000, 60 days, Band B.**\n\nNajd Horizon shows a current ratio of 1.63 and no returned payments in 12 months. VAT-declared sales reconcile with bank inflows within 2.5%. The main weakness is concentration: one government-paid project is 70% of backlog. Condition: review at six months or if the Al Narjis payment cycle exceeds 90 days.",
      ai: ai("Credit memo drafter", 0.88),
    },
    decision: {
      outcome: "approve",
      decidedBy: "Reem Al-Harbi, Credit Manager (fictional)",
      decidedAt: "2026-10-27T11:20:00Z",
      reasonCodes: ["strong_liquidity", "clean_payment_history", "payer_concentration"],
      reasonText: "Approved at SAR 1,500,000 rather than the SAR 2,000,000 requested because one project makes up 70% of your backlog. We will review the cap in six months.",
      approvedCap: sar(1_500_000),
      conditions: ["Review in six months", "Notify the platform if Al Narjis payment certificates run more than 90 days"],
      overrodeAi: false,
    },
    log: [
      { at: "2026-10-20T09:00:00Z", actor: "contractor", action: "Application submitted", detail: "8 documents uploaded" },
      { at: "2026-10-20T09:02:00Z", actor: "ai_agent", action: "Documents parsed (simulated)", detail: "23 fields extracted" },
      { at: "2026-10-20T09:03:00Z", actor: "ai_agent", action: "Gated checks run (simulated)", detail: "4 pass, 1 flag" },
      { at: "2026-10-21T08:15:00Z", actor: "ai_agent", action: "Credit memo drafted (simulated)" },
      { at: "2026-10-27T11:20:00Z", actor: "credit_manager", action: "Approved", detail: "Cap SAR 1,500,000, 60 days" },
    ],
    submittedAt: "2026-10-20T09:00:00Z",
    updatedAt: "2026-10-27T11:20:00Z",
    platformHistory: { posPlaced: 6, posPaidOnTime: 5, totalSpend: sar(1_840_000) },
  },
  {
    id: "cc_502" as CreditCaseId,
    contractorId: org("con_hijaz"),
    status: "in_assessment",
    requestedCap: sar(600_000),
    requestedTenorDays: 90,
    purpose: "Finishes and MEP materials for Obhur clinic",
    documents: hijazDocs,
    gates: [
      { id: "cr", order: 1, label: "Commercial Registration", result: "pass", detail: "Active CR.", evidence: [{ documentId: did("d_hijaz_cr"), fieldKey: "cr_status" }] },
      { id: "vat", order: 2, label: "ZATCA VAT returns", result: "flag", detail: "Declared sales are 34% above annualised bank inflows.", evidence: [{ documentId: did("d_hijaz_vat"), fieldKey: "vat_revenue_12m" }, { documentId: did("d_hijaz_bank"), fieldKey: "bank_inflows_6m" }] },
      { id: "bank", order: 3, label: "Bank statements", result: "flag", detail: "Only 6 months supplied; 2 returned payments.", evidence: [{ documentId: did("d_hijaz_bank"), fieldKey: "bank_returned_items" }] },
      { id: "financials", order: 4, label: "Audited financials (Qawaem)", result: "pending", detail: "Parsed; audit opinion page not found.", evidence: [] },
      { id: "simah", order: 5, label: "SIMAH commercial report", result: "pending", detail: "Runs last. Report not yet provided.", evidence: [] },
    ],
    log: [
      { at: "2026-11-14T10:00:00Z", actor: "contractor", action: "Application submitted", detail: "7 of 8 documents uploaded" },
      { at: "2026-11-14T10:02:00Z", actor: "ai_agent", action: "Documents parsed (simulated)", detail: "3 documents flagged" },
      { at: "2026-11-15T07:30:00Z", actor: "credit_manager", action: "Case opened" },
    ],
    submittedAt: "2026-11-14T10:00:00Z",
    updatedAt: "2026-11-15T07:30:00Z",
    platformHistory: { posPlaced: 2, posPaidOnTime: 2, totalSpend: sar(214_000) },
  },
  {
    id: "cc_503" as CreditCaseId,
    contractorId: org("con_sharq"),
    status: "submitted",
    requestedCap: sar(4_000_000),
    requestedTenorDays: 90,
    purpose: "Steel and cables for Jubail Logistics Warehouses Phase 2",
    documents: [
      doc("d_sharq_cr", "cr", "CR-Sharq-Gulf.pdf", "uploaded", "valid to 2028-03-02"),
      doc("d_sharq_vat", "vat_returns", "VAT-returns.pdf", "uploaded", "Q4 2025 – Q3 2026"),
      doc("d_sharq_bank", "bank_statements", "Bank-statements-12m.pdf", "uploaded", "Oct 2025 – Sep 2026"),
      doc("d_sharq_fin", "audited_financials", "Qawaem-FY2025.pdf", "uploaded", "FY2025"),
      doc("d_sharq_simah", "simah_report", "SIMAH-report.pdf", "uploaded", "issued 2026-11-10"),
      doc("d_sharq_zakat", "zakat_certificate", "Zakat.pdf", "uploaded", "valid to 2027-04-30"),
      doc("d_sharq_gosi", "gosi_certificate", "GOSI.pdf", "uploaded", "issued 2026-11-01"),
      doc("d_sharq_class", "classification_certificate", "Classification.pdf", "uploaded", "valid to 2027-09-20"),
    ],
    gates: [
      { id: "cr", order: 1, label: "Commercial Registration", result: "pending", detail: "Queued.", evidence: [] },
      { id: "vat", order: 2, label: "ZATCA VAT returns", result: "pending", detail: "Queued.", evidence: [] },
      { id: "bank", order: 3, label: "Bank statements", result: "pending", detail: "Queued.", evidence: [] },
      { id: "financials", order: 4, label: "Audited financials (Qawaem)", result: "pending", detail: "Queued.", evidence: [] },
      { id: "simah", order: 5, label: "SIMAH commercial report", result: "pending", detail: "Runs last.", evidence: [] },
    ],
    log: [{ at: "2026-11-18T07:45:00Z", actor: "contractor", action: "Application submitted", detail: "8 documents uploaded" }],
    submittedAt: "2026-11-18T07:45:00Z",
    updatedAt: "2026-11-18T07:45:00Z",
    platformHistory: { posPlaced: 0, posPaidOnTime: 0, totalSpend: sar(0) },
  },
];

const najdDrawn = purchaseOrders
  .filter((po) => po.creditDraw?.creditCaseId === "cc_501" && !po.creditDraw.repaidAt)
  .reduce((sum, po) => sum + (po.creditDraw?.principal ?? 0), 0);

export const creditFacilities: CreditFacility[] = [
  {
    creditCaseId: "cc_501" as CreditCaseId,
    contractorId: org("con_najd"),
    cap: sar(1_500_000),
    drawn: sar(najdDrawn / 100),
    band: "B",
    maxTenorDays: 60,
    profitRate: 0.03,
    conditions: ["Review in six months"],
    approvedAt: "2026-10-27T11:20:00Z",
    reviewDue: "2027-04-27",
  },
];
