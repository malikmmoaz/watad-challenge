/**
 * SAMPLE DATA. The figures the simulated document reader "extracts" for each
 * contractor, as input to the credit engine (src/domain/credit). Fictional.
 */
import { sar } from "@/domain/money";
import { SAMPLE_CASES, bunyanAlHijaz, durratAlQassim, rawasiNajd, sahelAlSharq } from "@/domain/credit/samples";
import type { CreditProfile, DocKey } from "@/domain/credit/types";
import type { CreditCase, CreditCaseId, OrgId } from "@/domain/types";

const ALL_DOCS: DocKey[] = ["cr", "vat_returns", "zakat_certificate", "simah_report", "financials_qawaem", "bank_statements", "gosi_certificate", "contractor_classification", "contracts_in_hand"];

/** Najd Horizon (demo contractor persona): used when it applies for a new or higher cap. */
const najd: CreditProfile = {
  id: "con_najd",
  applicant: { name: "Najd Horizon Contracting Co.", city: "Riyadh", crNumber: "1010XXXX41", yearsTrading: 11, classificationGrade: 3 },
  request: { capSar: 2_000_000, tenorDays: 60 },
  monthlyPurchasesSar: 1_400_000,
  documentsProvided: ALL_DOCS,
  tamperFlags: [],
  cr: { status: "active", expiresOn: "2027-08-30" },
  vat: { registered: true, annualRevenueSar: 61_400_000, lateFilings: 0 },
  zakat: { validUntil: "2027-04-30" },
  gosi: { validUntil: "2027-01-01" },
  bank: { monthsProvided: 12, annualInflowsSar: 69_800_000, avgBalanceSar: 3_150_000, returnedCheques: 0, negativeBalanceDays: 0, inflowVolatility: 0.3 },
  financials: { audited: true, revenueSar: 58_700_000, netProfitSar: 3_820_000, currentAssetsSar: 24_600_000, currentLiabilitiesSar: 15_100_000, totalLiabilitiesSar: 21_000_000, netWorthSar: 18_900_000 },
  simah: { consent: true, report: { score: 735, unsettledDefaultSar: 0, delinquencies12m: 1 } },
  platform: { ordersPaid: 5, avgDaysLate: 2 },
  contracts: [
    { payer: "Ministry of Education (via Tatweer Buildings)", payerType: "government", valueSar: 48_500_000, remainingSar: 28_100_000, retentionPct: 10, percentComplete: 42, billedPct: 38, overdueReceivableSar: 1_200_000 },
    { payer: "Dar Al Wessam Development (fictional)", payerType: "large_private", valueSar: 21_200_000, remainingSar: 17_400_000, retentionPct: 5, percentComplete: 18, billedPct: 15, overdueReceivableSar: 0 },
  ],
  openLegalCases: 0,
};

/** Hijaz Peaks: VAT sales well above bank inflows, Zakat expired, no SIMAH report yet. Refer. */
const hijaz: CreditProfile = {
  id: "con_hijaz",
  applicant: { name: "Hijaz Peaks Building Est.", city: "Jeddah", crNumber: "4030XXXX87", yearsTrading: 6, classificationGrade: 4 },
  request: { capSar: 600_000, tenorDays: 90 },
  monthlyPurchasesSar: 450_000,
  documentsProvided: ALL_DOCS.filter((d) => d !== "simah_report" && d !== "contracts_in_hand"),
  tamperFlags: [],
  cr: { status: "active", expiresOn: "2027-02-11" },
  vat: { registered: true, annualRevenueSar: 14_800_000, lateFilings: 1 },
  zakat: { validUntil: "2026-09-30" },
  gosi: { validUntil: "2027-01-05" },
  bank: { monthsProvided: 6, annualInflowsSar: 11_270_000, avgBalanceSar: 240_000, returnedCheques: 2, negativeBalanceDays: 6, inflowVolatility: 0.55 },
  financials: { audited: true, revenueSar: 13_900_000, netProfitSar: 610_000, currentAssetsSar: 5_200_000, currentLiabilitiesSar: 4_700_000, totalLiabilitiesSar: 5_900_000, netWorthSar: 2_300_000 },
  simah: { consent: true, report: null },
  platform: null,
  contracts: [
    { payer: "Red Sea Build Group (fictional main contractor)", payerType: "main_contractor", valueSar: 9_800_000, remainingSar: 3_600_000, retentionPct: 10, percentComplete: 63, billedPct: 51, overdueReceivableSar: 600_000 },
  ],
  openLegalCases: 0,
};

/** Sharq Gulf: large and sound, but one giga-project is the whole backlog. Approve with conditions. */
const sharq: CreditProfile = {
  id: "con_sharq",
  applicant: { name: "Sharq Gulf Industrial Contracting", city: "Dammam", crNumber: "2050XXXX19", yearsTrading: 19, classificationGrade: 2 },
  request: { capSar: 4_000_000, tenorDays: 90 },
  monthlyPurchasesSar: 2_600_000,
  documentsProvided: ALL_DOCS,
  tamperFlags: [],
  cr: { status: "active", expiresOn: "2028-03-02" },
  vat: { registered: true, annualRevenueSar: 96_000_000, lateFilings: 0 },
  zakat: { validUntil: "2027-04-30" },
  gosi: { validUntil: "2027-02-01" },
  bank: { monthsProvided: 12, annualInflowsSar: 108_000_000, avgBalanceSar: 5_400_000, returnedCheques: 0, negativeBalanceDays: 0, inflowVolatility: 0.35 },
  financials: { audited: true, revenueSar: 94_500_000, netProfitSar: 6_100_000, currentAssetsSar: 47_000_000, currentLiabilitiesSar: 32_000_000, totalLiabilitiesSar: 41_000_000, netWorthSar: 31_000_000 },
  simah: { consent: true, report: { score: 760, unsettledDefaultSar: 0, delinquencies12m: 0 } },
  platform: null,
  contracts: [
    { payer: "Giga-project logistics package (fictional)", payerType: "giga_project", valueSar: 132_000_000, remainingSar: 96_400_000, retentionPct: 10, percentComplete: 27, billedPct: 24, overdueReceivableSar: 2_100_000 },
  ],
  openLegalCases: 0,
};

/** Engine profile per contractor; the simulated document reader's output. */
export const creditProfiles: Record<string, CreditProfile> = {
  con_najd: najd,
  con_hijaz: hijaz,
  con_sharq: sharq,
  con_rawasi_najd: rawasiNajd,
  con_durrat_qassim: durratAlQassim,
  con_sahel_sharq: sahelAlSharq,
  con_bunyan_hijaz: bunyanAlHijaz,
};

/** Applicants that exist only in the credit queue (not in the procurement reference data). */
const SAMPLE_ORG: Record<string, string> = {
  [rawasiNajd.id]: "con_rawasi_najd",
  [durratAlQassim.id]: "con_durrat_qassim",
  [sahelAlSharq.id]: "con_sahel_sharq",
  [bunyanAlHijaz.id]: "con_bunyan_hijaz",
};

/** The four engine sample cases, submitted and waiting in the credit manager's queue. */
export const sampleQueueCases: CreditCase[] = SAMPLE_CASES.map((p, i) => {
  const id = `cc_${511 + i}` as CreditCaseId;
  const at = `2026-11-1${7 + (i % 2)}T0${7 + i}:30:00Z`;
  return {
    id,
    contractorId: (SAMPLE_ORG[p.id] ?? p.id) as OrgId,
    status: "submitted",
    requestedCap: sar(p.request.capSar),
    requestedTenorDays: p.request.tenorDays as 30 | 60 | 90,
    purpose: "Materials for contracts in hand",
    documents: [],
    gates: [
      { id: "cr", order: 1, label: "Commercial Registration", result: "pending", detail: "Queued.", evidence: [] },
      { id: "vat", order: 2, label: "ZATCA VAT returns", result: "pending", detail: "Queued.", evidence: [] },
      { id: "bank", order: 3, label: "Bank statements", result: "pending", detail: "Queued.", evidence: [] },
      { id: "financials", order: 4, label: "Audited financials (Qawaem)", result: "pending", detail: "Queued.", evidence: [] },
      { id: "simah", order: 5, label: "SIMAH commercial report", result: "pending", detail: "Runs last.", evidence: [] },
    ],
    log: [{ at, actor: "contractor", action: "Application submitted", detail: `${p.documentsProvided.length} documents uploaded` }],
    submittedAt: at,
    updatedAt: at,
    platformHistory: { posPlaced: 0, posPaidOnTime: 0, totalSpend: sar(0) },
  };
});

/** Display name for any applicant, including queue-only sample applicants. */
export function applicantName(contractorId: string, contractors: { id: string; name: string }[]): string {
  return contractors.find((c) => c.id === contractorId)?.name ?? creditProfiles[contractorId]?.applicant.name ?? contractorId;
}
