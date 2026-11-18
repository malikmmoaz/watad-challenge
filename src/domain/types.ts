/**
 * Shared domain types — FROZEN at hour 2 (see docs/adr/0001-stack.md).
 * Changes after the freeze go through Tariq via a PR labelled `types`.
 *
 * Conventions
 * - Money is an integer number of halalas (1 SAR = 100 halalas), VAT-exclusive
 *   unless the field name ends in `InclVat`. Use `src/domain/money.ts` helpers.
 * - Dates are ISO 8601 strings (UTC). Never `Date` in domain objects, so they
 *   serialise cleanly between server and client components.
 * - Ids are opaque branded strings with a readable prefix (e.g. `rfq_1042`).
 */

// ---------- primitives ----------

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type OrgId = Brand<string, "OrgId">;
export type MaterialId = Brand<string, "MaterialId">;
export type RfqId = Brand<string, "RfqId">;
export type OfferId = Brand<string, "OfferId">;
export type PoId = Brand<string, "PoId">;
export type CreditCaseId = Brand<string, "CreditCaseId">;
export type DocumentId = Brand<string, "DocumentId">;

/** Integer halalas. 1 SAR = 100 halalas. */
export type Halalas = Brand<number, "Halalas">;
export type IsoDate = string;

export type Role = "contractor" | "supplier" | "credit";

export type City =
  | "Riyadh"
  | "Jeddah"
  | "Dammam"
  | "Jubail"
  | "Makkah"
  | "Madinah"
  | "Tabuk";

/** Marks anything produced by the simulated AI layer. UI must show the label. */
export interface SimulatedAi {
  simulated: true;
  /** Short human-readable name of the simulated agent, e.g. "BOQ reader". */
  agent: string;
  /** 0..1 */
  confidence: number;
}

// ---------- organisations ----------

export interface Contractor {
  id: OrgId;
  kind: "contractor";
  name: string;
  nameAr?: string;
  city: City;
  crNumber: string;
  /** Saudi contractor classification grade, 1 (largest) to 5. */
  classificationGrade: 1 | 2 | 3 | 4 | 5;
  yearsOperating: number;
  activeProjects: Project[];
}

export interface Project {
  id: string;
  name: string;
  city: City;
  /** Who pays the contractor on this project. */
  payer: { name: string; type: PayerType };
  contractValue: Halalas;
  percentComplete: number;
}

export type PayerType = "government" | "giga_project" | "main_contractor" | "private_developer";

export type MaterialCategory =
  | "cement"
  | "rebar_steel"
  | "ready_mix"
  | "cables_electrical"
  | "pipes_plumbing"
  | "finishes"
  | "blocks_aggregates";

export interface Supplier {
  id: OrgId;
  kind: "supplier";
  /** Fictional distributor name. Never a real company. */
  name: string;
  nameAr?: string;
  city: City;
  categories: MaterialCategory[];
  /** Real manufacturer brands this fictional distributor stocks. */
  brandsStocked: string[];
  /** Cities it delivers to. */
  serviceCities: City[];
  /** Product is manufactured in KSA / supplier is a local SME (10% price preference). */
  localContent: boolean;
  vetted: boolean;
  performance: SupplierPerformance;
  /** Payment terms the supplier accepts by default. */
  acceptedTerms: PaymentTerms[];
  /** Whether it accepts platform credit (paid directly by the financier). */
  acceptsPlatformCredit: boolean;
}

export interface SupplierPerformance {
  /** 0..1 share of orders delivered on or before the promised date. */
  onTimeRate: number;
  /** 0..1 share of orders delivered complete and to spec. */
  fillRate: number;
  ordersCompleted: number;
  avgResponseHours: number;
  /** 0..1 share of orders with a quality or quantity dispute. */
  disputeRate: number;
}

// ---------- catalog ----------

export type Unit = "bag_50kg" | "tonne" | "m3" | "m" | "m2" | "roll" | "piece";

export interface Material {
  id: MaterialId;
  category: MaterialCategory;
  name: string;
  nameAr?: string;
  /** Spec line shown to both sides, e.g. "SASO 2849 Grade B500B, 16 mm". */
  spec: string;
  unit: Unit;
  /** Market benchmark unit price (sample data), used for the price flag. */
  benchmarkUnitPrice: Halalas;
  benchmarkSource: string;
  brands: string[];
}

// ---------- RFQ ----------

export type RfqStatus =
  | "draft"
  | "sent"
  | "offers_received"
  | "awarded"
  | "cancelled"
  | "expired";

export interface RfqLine {
  id: string;
  materialId: MaterialId;
  /** Free text when parsed from a BOQ and not yet matched; mirrors the catalog otherwise. */
  description: string;
  spec: string;
  quantity: number;
  unit: Unit;
  /** Present when the line came from simulated BOQ parsing. */
  parsedBy?: SimulatedAi;
}

export interface Rfq {
  id: RfqId;
  contractorId: OrgId;
  projectId: string;
  title: string;
  source: "upload" | "catalog";
  /** Original file name when `source` is "upload". */
  sourceFileName?: string;
  status: RfqStatus;
  lines: RfqLine[];
  deliveryCity: City;
  deliverySite: string;
  requiredBy: IsoDate;
  /** Offers close at this time. */
  closesAt: IsoDate;
  preferredTerms: PaymentTerms;
  /** Contractor intends to pay with platform credit. */
  wantsCredit: boolean;
  /** Suppliers invited from the shortlist. */
  invitedSupplierIds: OrgId[];
  /** Blind comparison: supplier names hidden from the contractor until award. */
  blindComparison: boolean;
  createdAt: IsoDate;
  notes?: string;
}

// ---------- shortlist (explainable, credit-aware) ----------

export type ShortlistReasonCode =
  | "stocks_category"
  | "delivers_to_city"
  | "on_time_record"
  | "fill_rate"
  | "accepts_credit"
  | "accepts_terms"
  | "local_content"
  | "price_history"
  | "does_not_deliver"
  | "no_credit_acceptance"
  | "terms_mismatch"
  | "capacity_risk"
  | "exceeds_credit_cap";

export interface ShortlistReason {
  code: ShortlistReasonCode;
  /** Positive reasons support the match; negative ones are the "why not". */
  polarity: "positive" | "negative";
  text: string;
  /** Points this reason contributed to the match score. */
  points: number;
}

export interface ShortlistEntry {
  supplierId: OrgId;
  /** 0..100 */
  matchScore: number;
  recommended: boolean;
  reasons: ShortlistReason[];
  /** Whether the estimated order value fits the contractor's remaining credit cap. */
  fitsCreditCap: boolean | null;
}

// ---------- offers ----------

export type PaymentTerms =
  | { kind: "advance" }
  | { kind: "on_delivery" }
  | { kind: "net"; days: 30 | 60 | 90 }
  | { kind: "platform_credit"; days: 30 | 60 | 90 };

export type OfferStatus = "submitted" | "withdrawn" | "awarded" | "not_selected" | "expired";

export type StockStatus = "in_stock" | "partial" | "made_to_order";

export interface OfferLine {
  rfqLineId: string;
  unitPrice: Halalas;
  /** Quantity the supplier can actually supply; may be less than requested. */
  quantityAvailable: number;
  stock: StockStatus;
  /** Brand offered; an alternative to the requested spec must set `isAlternative`. */
  brand: string;
  isAlternative: boolean;
  alternativeNote?: string;
}

export interface Offer {
  id: OfferId;
  rfqId: RfqId;
  supplierId: OrgId;
  status: OfferStatus;
  lines: OfferLine[];
  /** Delivery charge for the whole order, VAT-exclusive. */
  deliveryFee: Halalas;
  leadTimeDays: number;
  paymentTerms: PaymentTerms;
  localContent: boolean;
  validUntil: IsoDate;
  submittedAt: IsoDate;
  notes?: string;
}

/** Output of offer levelling; computed, never stored. */
export interface OfferComparison {
  offerId: OfferId;
  subtotal: Halalas;
  deliveryFee: Halalas;
  vat: Halalas;
  /** subtotal + delivery + VAT */
  landedCostInclVat: Halalas;
  /** Landed cost after the 10% local-content price preference, for ranking only. */
  evaluatedCost: Halalas;
  /** Percent above (+) or below (-) the market benchmark. */
  vsBenchmarkPct: number;
  priceFlag: "below_market" | "in_line" | "above_market";
  /** 0..1 share of requested quantity covered. */
  coverage: number;
  meetsRequiredBy: boolean;
  /** 0..100 weighted score across cost, lead time, terms, reliability, local content. */
  score: number;
  scoreBreakdown: { factor: ComparisonFactor; weight: number; points: number; note: string }[];
  rank: number;
}

export type ComparisonFactor = "cost" | "lead_time" | "payment_terms" | "reliability" | "local_content" | "coverage";

// ---------- purchase orders ----------

export type PoStatus =
  | "placed"
  | "confirmed"
  | "dispatched"
  | "delivered"
  | "invoiced"
  | "paid"
  | "cancelled";

export interface PoEvent {
  status: PoStatus;
  at: IsoDate;
  actor: Role | "platform";
  note?: string;
}

export type PaymentMethod = "platform_credit" | "bank_transfer";

export interface PurchaseOrder {
  id: PoId;
  rfqId: RfqId;
  offerId: OfferId;
  contractorId: OrgId;
  supplierId: OrgId;
  status: PoStatus;
  timeline: PoEvent[];
  subtotal: Halalas;
  deliveryFee: Halalas;
  vat: Halalas;
  totalInclVat: Halalas;
  paymentMethod: PaymentMethod;
  /** Present when `paymentMethod` is "platform_credit". */
  creditDraw?: CreditDraw;
  expectedDelivery: IsoDate;
  placedAt: IsoDate;
}

// ---------- credit ----------

/**
 * Murabaha-style financing: the financier buys the materials, pays the supplier
 * directly, and the contractor repays cost plus markup on the due date.
 * Wording rule: "profit rate" / "Murabaha markup" with APR. Never "interest".
 */
export interface CreditDraw {
  poId: PoId;
  creditCaseId: CreditCaseId;
  principal: Halalas;
  tenorDays: 30 | 60 | 90;
  /** Flat markup for the tenor, as a fraction (0.025 = 2.5%). */
  profitRate: number;
  markup: Halalas;
  /** Annualised equivalent of `profitRate`, as a fraction. */
  apr: number;
  totalRepayable: Halalas;
  dueDate: IsoDate;
  supplierPaidAt?: IsoDate;
  repaidAt?: IsoDate;
}

export interface CreditFacility {
  creditCaseId: CreditCaseId;
  contractorId: OrgId;
  /** Approved credit cap. */
  cap: Halalas;
  /** Sum of outstanding principal across open draws. */
  drawn: Halalas;
  /** cap - drawn */
  available: Halalas;
  band: CreditBand;
  maxTenorDays: 30 | 60 | 90;
  profitRate: number;
  conditions: string[];
  approvedAt: IsoDate;
  reviewDue: IsoDate;
}

export type CreditDocumentType =
  | "cr"
  | "vat_returns"
  | "zakat_certificate"
  | "simah_report"
  | "audited_financials"
  | "bank_statements"
  | "gosi_certificate"
  | "classification_certificate"
  | "contracts_in_hand"
  | "wip_schedule"
  | "receivables_aging";

export type DocumentStatus = "missing" | "uploaded" | "parsed" | "verified" | "flagged" | "rejected";

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  /** Where in the document it came from, e.g. "p.3, Balance sheet, line 14". */
  location: string;
  /** 0..1 */
  confidence: number;
}

export interface DocumentFinding {
  severity: "info" | "warning" | "critical";
  kind: "tamper_signal" | "cross_document_mismatch" | "expired" | "missing_page" | "consistent";
  text: string;
  /** Other documents this finding compares against. */
  relatedDocumentIds: DocumentId[];
  ai: SimulatedAi;
}

export interface CreditDocument {
  id: DocumentId;
  type: CreditDocumentType;
  fileName: string;
  status: DocumentStatus;
  uploadedAt?: IsoDate;
  /** Period covered or expiry, free text, e.g. "FY2025" or "valid to 2027-03-14". */
  period?: string;
  extracted: ExtractedField[];
  findings: DocumentFinding[];
}

export type CreditCaseStatus =
  | "draft"
  | "submitted"
  | "documents_review"
  | "in_assessment"
  | "more_info_requested"
  | "approved"
  | "declined";

export type GateId = "cr" | "vat" | "bank" | "financials" | "simah";
export type GateResult = "pass" | "flag" | "fail" | "pending";

/** Gated checks run cheapest first; SIMAH last. */
export interface GatedCheck {
  id: GateId;
  order: number;
  label: string;
  result: GateResult;
  detail: string;
  evidence: EvidenceRef[];
}

/** Points a claim back to the exact extracted field of a document. */
export interface EvidenceRef {
  documentId: DocumentId;
  fieldKey: string;
  note?: string;
}

export type ScoreFactorId =
  | "liquidity"
  | "payment_history"
  | "payer_quality"
  | "leverage_profitability"
  | "backlog_capacity"
  | "wip_health"
  | "bank_cashflow"
  | "concentration"
  | "track_record"
  | "compliance";

export interface ScoreFactor {
  id: ScoreFactorId;
  label: string;
  /** Maximum points; all factors sum to 100. */
  weight: number;
  points: number;
  whyItMatters: string;
  rationale: string;
  evidence: EvidenceRef[];
}

export type CreditBand = "A" | "B" | "C" | "D";

export interface PolicyCheck {
  id: string;
  rule: string;
  observed: string;
  result: "pass" | "refer" | "fail";
}

export interface Scorecard {
  factors: ScoreFactor[];
  /** 0..100 */
  total: number;
  band: CreditBand;
  policyChecks: PolicyCheck[];
  /** Factor ids with the largest positive and negative effect. */
  topFactors: { factorId: ScoreFactorId; direction: "up" | "down" }[];
  proposedCap: Halalas;
  capBasis: { method: string; amount: Halalas }[];
}

export type CreditDecisionOutcome = "approve" | "decline" | "request_info";

export type ReasonCode =
  | "strong_liquidity"
  | "clean_payment_history"
  | "quality_payers"
  | "thin_liquidity"
  | "high_leverage"
  | "payer_concentration"
  | "late_payments_simah"
  | "vat_bank_mismatch"
  | "document_tamper_signal"
  | "document_missing"
  | "document_expired"
  | "over_extended_backlog"
  | "compliance_lapse";

export interface AiCreditProposal {
  outcome: CreditDecisionOutcome;
  proposedCap?: Halalas;
  reasonCodes: ReasonCode[];
  /** AI-drafted credit memo, markdown. */
  memo: string;
  ai: SimulatedAi;
}

export interface CreditDecision {
  outcome: CreditDecisionOutcome;
  decidedBy: string;
  decidedAt: IsoDate;
  reasonCodes: ReasonCode[];
  /** Reason shown to the contractor. */
  reasonText: string;
  approvedCap?: Halalas;
  conditions?: string[];
  /** Documents or clarifications requested when outcome is "request_info". */
  requestedItems?: string[];
  /** True when the manager's outcome differs from the AI proposal. */
  overrodeAi: boolean;
  overrideReason?: string;
}

export interface DecisionLogEntry {
  at: IsoDate;
  actor: "contractor" | "credit_manager" | "ai_agent" | "platform";
  action: string;
  detail?: string;
}

export interface CreditCase {
  id: CreditCaseId;
  contractorId: OrgId;
  status: CreditCaseStatus;
  requestedCap: Halalas;
  requestedTenorDays: 30 | 60 | 90;
  purpose: string;
  documents: CreditDocument[];
  gates: GatedCheck[];
  scorecard?: Scorecard;
  aiProposal?: AiCreditProposal;
  decision?: CreditDecision;
  log: DecisionLogEntry[];
  submittedAt?: IsoDate;
  updatedAt: IsoDate;
  /** On-platform history fed into the review. */
  platformHistory: { posPlaced: number; posPaidOnTime: number; totalSpend: Halalas };
}
