/**
 * Contractor credit application (#12): document requirements, validation,
 * building a submitted case and the progress tracker. Pure: the clock and ids
 * are passed in so the logic is unit-testable.
 */
import { sar } from "./money";
import type {
  CreditCase,
  CreditCaseId,
  CreditCaseStatus,
  CreditDocument,
  CreditDocumentType,
  DocumentId,
  GatedCheck,
  Halalas,
  IsoDate,
  OrgId,
} from "./types";

export interface DocumentRequirement {
  type: CreditDocumentType;
  label: string;
  /** One line shown to the contractor: why the credit manager asks for it. */
  whyItMatters: string;
  /** What to upload, e.g. "last 4 quarters". */
  hint: string;
  required: boolean;
}

export const DOCUMENT_REQUIREMENTS: readonly DocumentRequirement[] = [
  { type: "cr", label: "Commercial Registration (CR)", whyItMatters: "Proves the company exists, is active and is licensed for contracting.", hint: "Current CR extract", required: true },
  { type: "vat_returns", label: "ZATCA VAT returns", whyItMatters: "Confirm declared revenue, the anchor every other figure is checked against.", hint: "Last 4 quarters", required: true },
  { type: "bank_statements", label: "Bank statements", whyItMatters: "Show real cash in and out, and confirm the revenue in your VAT returns.", hint: "6 to 12 months, all operating accounts", required: true },
  { type: "audited_financials", label: "Audited financial statements (Qawaem)", whyItMatters: "Net worth and working capital set the size of your credit cap.", hint: "Latest financial year, as filed on Qawaem", required: true },
  { type: "zakat_certificate", label: "Zakat certificate", whyItMatters: "Shows good standing with ZATCA; government payers require it before paying you.", hint: "Valid certificate", required: true },
  { type: "gosi_certificate", label: "GOSI certificate", whyItMatters: "Confirms your headcount and payroll are real and up to date.", hint: "Issued in the last 3 months", required: true },
  { type: "contracts_in_hand", label: "Contracts in hand", whyItMatters: "Show where repayment will come from: who pays you, how much and the retention held.", hint: "Signed contracts or award letters with payer and retention", required: true },
  { type: "classification_certificate", label: "Contractor classification certificate", whyItMatters: "Shows the size of project you are officially graded to deliver.", hint: "If classified", required: false },
  { type: "simah_report", label: "SIMAH report", whyItMatters: "Shows how existing lenders and suppliers have been repaid. With your consent we pull it ourselves, last.", hint: "Optional if you give consent below", required: false },
  { type: "wip_schedule", label: "Work-in-progress schedule", whyItMatters: "Progress against billing per project reveals under-billing and cost overruns early.", hint: "Optional, speeds up review", required: false },
  { type: "receivables_aging", label: "Receivables aging", whyItMatters: "Shows how quickly your own clients pay you.", hint: "Optional, speeds up review", required: false },
];

export const CAP_LIMITS = { min: sar(50_000), max: sar(10_000_000) } as const;
export const TENORS = [30, 60, 90] as const;
export type Tenor = (typeof TENORS)[number];

export interface ApplicationDraft {
  requestedCapSar: number;
  tenorDays: Tenor;
  purpose: string;
  /** File names chosen per document type. Files stay in the browser: nothing is uploaded in the demo. */
  files: Partial<Record<CreditDocumentType, string>>;
  simahConsent: boolean;
  declarationAccepted: boolean;
}

export type DraftErrors = Partial<Record<"requestedCap" | "purpose" | "documents" | "simahConsent" | "declaration", string>>;

export function missingRequiredDocuments(files: ApplicationDraft["files"]): DocumentRequirement[] {
  return DOCUMENT_REQUIREMENTS.filter((r) => r.required && !files[r.type]);
}

/** With a current cap, the application is for a higher one: it must ask for more. */
export function validateDraft(d: ApplicationDraft, currentCap?: Halalas): DraftErrors {
  const e: DraftErrors = {};
  const cap = sar(d.requestedCapSar);
  if (!Number.isFinite(d.requestedCapSar) || cap < CAP_LIMITS.min || cap > CAP_LIMITS.max) {
    e.requestedCap = "Enter a cap between SAR 50,000 and SAR 10,000,000.";
  } else if (currentCap !== undefined && cap <= currentCap) {
    e.requestedCap = "Ask for more than your current cap.";
  }
  if (d.purpose.trim().length < 10) e.purpose = "Tell us what the materials are for (at least 10 characters).";
  const missing = missingRequiredDocuments(d.files);
  if (missing.length > 0) e.documents = `Still needed: ${missing.map((m) => m.label).join(", ")}.`;
  if (!d.simahConsent) e.simahConsent = "SIMAH consent is required to assess payment history.";
  if (!d.declarationAccepted) e.declaration = "Confirm the documents are genuine and complete.";
  return e;
}

const GATES: Pick<GatedCheck, "id" | "order" | "label">[] = [
  { id: "cr", order: 1, label: "Commercial Registration" },
  { id: "vat", order: 2, label: "ZATCA VAT returns" },
  { id: "bank", order: 3, label: "Bank statements" },
  { id: "financials", order: 4, label: "Audited financials (Qawaem)" },
  { id: "simah", order: 5, label: "SIMAH commercial report" },
];

/** Turns a valid draft into a submitted case that appears in the credit manager's queue. */
export function buildSubmittedCase(
  d: ApplicationDraft,
  opts: { id: CreditCaseId; contractorId: OrgId; now: IsoDate; platformHistory: CreditCase["platformHistory"] },
): CreditCase {
  const errors = validateDraft(d);
  if (Object.keys(errors).length > 0) throw new Error(`Invalid application: ${Object.values(errors).join(" ")}`);
  const documents: CreditDocument[] = [];
  for (const r of DOCUMENT_REQUIREMENTS) {
    const id = `${opts.id}_${r.type}` as DocumentId;
    const fileName = d.files[r.type];
    if (fileName) {
      documents.push({ id, type: r.type, fileName, status: "uploaded", uploadedAt: opts.now, extracted: [], findings: [] });
    } else if (r.type === "simah_report") {
      // With consent, the platform pulls the report itself as the last gated check.
      documents.push({ id, type: r.type, fileName: "", status: "missing", period: "to be pulled with consent", extracted: [], findings: [] });
    }
  }
  const uploaded = documents.filter((x) => x.status === "uploaded").length;
  return {
    id: opts.id,
    contractorId: opts.contractorId,
    status: "submitted",
    requestedCap: sar(d.requestedCapSar),
    requestedTenorDays: d.tenorDays,
    purpose: d.purpose.trim(),
    documents,
    gates: GATES.map((g) => ({ ...g, result: "pending", detail: g.id === "simah" ? "Runs last." : "Queued.", evidence: [] })),
    log: [
      { at: opts.now, actor: "contractor", action: "Application submitted", detail: `${uploaded} documents uploaded` },
      ...(d.simahConsent ? [{ at: opts.now, actor: "contractor" as const, action: "SIMAH consent given" }] : []),
    ],
    submittedAt: opts.now,
    updatedAt: opts.now,
    platformHistory: opts.platformHistory,
  };
}

/** Contractor answers a "more information requested" decision. Back to document review. */
export function provideMoreInfo(c: CreditCase, files: string[], note: string, now: IsoDate): CreditCase {
  if (c.status !== "more_info_requested") throw new Error(`Case ${c.id} is not waiting for information.`);
  if (files.length === 0 && note.trim() === "") throw new Error("Attach a file or write a note.");
  const added: CreditDocument[] = files.map((fileName, i) => ({
    id: `${c.id}_extra_${c.log.length}_${i}` as DocumentId,
    type: "contracts_in_hand",
    fileName,
    status: "uploaded",
    uploadedAt: now,
    period: "additional information",
    extracted: [],
    findings: [],
  }));
  return {
    ...c,
    status: "documents_review",
    documents: [...c.documents, ...added],
    log: [
      ...c.log,
      { at: now, actor: "contractor", action: "More information provided", detail: [files.join(", "), note.trim()].filter(Boolean).join(" · ") },
    ],
    updatedAt: now,
  };
}

export type StepState = "done" | "current" | "upcoming" | "skipped";

export interface TrackerStep {
  key: "submitted" | "checks" | "review" | "more_info" | "decided";
  label: string;
  description: string;
  state: StepState;
}

/** The five contractor-facing steps. "More info" is skipped unless it happened. */
export function trackerSteps(c: Pick<CreditCase, "status" | "log">): TrackerStep[] {
  const askedBefore = c.log.some((l) => l.action === "More information provided");
  const decided = c.status === "approved" || c.status === "declined";
  const progress: Record<CreditCaseStatus, [StepState, StepState, StepState]> = {
    draft: ["upcoming", "upcoming", "upcoming"],
    submitted: ["done", "current", "upcoming"],
    documents_review: ["done", "current", "upcoming"],
    in_assessment: ["done", "done", "current"],
    more_info_requested: ["done", "done", "done"],
    approved: ["done", "done", "done"],
    declined: ["done", "done", "done"],
  };
  const [submitted, checks, review] = progress[c.status];
  const moreInfo: StepState =
    c.status === "more_info_requested" ? "current" : askedBefore ? "done" : decided ? "skipped" : "upcoming";
  return [
    { key: "submitted", label: "Submitted", description: "Application and documents received.", state: submitted },
    { key: "checks", label: "Checks running", description: "Documents read and gated checks run, cheapest first, SIMAH last.", state: checks },
    { key: "review", label: "Under review", description: "An independent credit manager reviews the score and the evidence.", state: review },
    { key: "more_info", label: "More info requested", description: "Only if the credit manager needs something else from you.", state: moreInfo },
    { key: "decided", label: "Decided", description: "Outcome and reasons appear here.", state: decided ? "done" : "upcoming" },
  ];
}

export const STATUS_LABEL: Record<CreditCaseStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  documents_review: "Checks running",
  in_assessment: "Under review",
  more_info_requested: "More info requested",
  approved: "Approved",
  declined: "Declined",
};

/** Next case id after the ones already in the store, e.g. cc_504. */
export function nextCaseId(existing: { id: CreditCaseId }[]): CreditCaseId {
  const max = existing.reduce((m, c) => Math.max(m, Number(c.id.replace(/\D/g, "")) || 0), 500);
  return `cc_${max + 1}` as CreditCaseId;
}
