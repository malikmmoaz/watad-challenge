/**
 * Credit domain types. Amounts are whole SAR, ratios are 0..1, dates are ISO yyyy-mm-dd.
 * Everything in this folder is pure: no I/O, no clock, no randomness.
 */

export type DocKey =
  | 'cr'
  | 'vat_returns'
  | 'zakat_certificate'
  | 'simah_report'
  | 'financials_qawaem'
  | 'bank_statements'
  | 'gosi_certificate'
  | 'contractor_classification'
  | 'contracts_in_hand';

export type PayerType =
  | 'government'
  | 'semi_government'
  | 'listed'
  | 'large_private'
  | 'sme'
  | 'individual';

export interface ContractInHand {
  payer: string;
  payerType: PayerType;
  valueSar: number;
  remainingSar: number;
  retentionPct: number;
  /** Physical progress, 0..100. */
  percentComplete: number;
  /** Share of contract value invoiced, 0..100. */
  billedPct: number;
  overdueReceivableSar: number;
}

export interface CreditCase {
  id: string;
  applicant: {
    name: string;
    city: string;
    crNumber: string;
    yearsTrading: number;
    /** Contractor classification grade 1 (highest) to 5; null when unclassified. */
    classificationGrade: 1 | 2 | 3 | 4 | 5 | null;
  };
  request: { capSar: number; tenorDays: number };
  /** Average monthly materials spend the cap would finance. */
  monthlyPurchasesSar: number;
  documentsProvided: DocKey[];
  /** Simulated document-forensics findings; any entry blocks an automatic approval. */
  tamperFlags: { doc: DocKey; note: string }[];
  cr: { status: 'active' | 'expired' | 'suspended'; expiresOn: string } | null;
  vat: { registered: boolean; annualRevenueSar: number; lateFilings: number } | null;
  zakat: { validUntil: string } | null;
  gosi: { validUntil: string } | null;
  bank: {
    monthsProvided: number;
    /** Annualised credits, VAT inclusive. */
    annualInflowsSar: number;
    avgBalanceSar: number;
    returnedCheques: number;
    negativeBalanceDays: number;
    /** Coefficient of variation of monthly inflows. */
    inflowVolatility: number;
  } | null;
  financials: {
    audited: boolean;
    revenueSar: number;
    netProfitSar: number;
    currentAssetsSar: number;
    currentLiabilitiesSar: number;
    totalLiabilitiesSar: number;
    netWorthSar: number;
  } | null;
  simah: {
    consent: boolean;
    /** Null until the report is pulled (it is the last, most expensive check). */
    report: {
      score: number;
      unsettledDefaultSar: number;
      delinquencies12m: number;
    } | null;
  };
  platform: { ordersPaid: number; avgDaysLate: number } | null;
  contracts: ContractInHand[];
  openLegalCases: number;
}

export type CheckId = 'cr' | 'vat' | 'bank' | 'financials' | 'simah';
export type CheckStatus = 'pass' | 'flag' | 'fail' | 'skipped';
/** Why a check failed: adverse evidence (decline) or missing/inconsistent input (refer). */
export type FailKind = 'adverse' | 'incomplete';

export interface CheckResult {
  id: CheckId;
  label: string;
  order: number;
  /** Indicative cost of running the check, the reason they run cheapest first. */
  costSar: number;
  status: CheckStatus;
  failKind?: FailKind;
  findings: string[];
  evidence: DocKey[];
}

export type FactorId =
  | 'liquidity'
  | 'payment_history'
  | 'payer_quality'
  | 'leverage_profitability'
  | 'backlog_capacity'
  | 'wip_health'
  | 'bank_behaviour'
  | 'concentration'
  | 'track_record'
  | 'compliance_disputes';

export interface FactorResult {
  id: FactorId;
  label: string;
  weight: number;
  /** 0..1 achievement on this factor. */
  ratio: number;
  /** weight x ratio, one decimal. */
  points: number;
  /** Points left on the table: weight minus points. */
  pointsLost: number;
  /** Whether the factor pulled the score up (at least half its weight earned) or down. */
  direction: 'raised' | 'lowered';
  /** False when the inputs were missing; the factor then scores 0 and the result is provisional. */
  assessed: boolean;
  whyItMatters: string;
  detail: string;
  evidence: DocKey[];
}

export type Band = 'A' | 'B' | 'C' | 'D';

export type RuleEffect = 'decline' | 'refer' | 'condition';

export interface PolicyRuleResult {
  id: string;
  label: string;
  effect: RuleEffect;
  breached: boolean;
  detail: string;
}

export interface LimitResult {
  tenPctNetWorthSar: number;
  tenPctWorkingCapitalSar: number;
  purchasesOverTermSar: number;
  binding: 'net_worth' | 'working_capital' | 'purchases';
  baseSar: number;
  bandMultiplier: number;
  /** Lowest of the three bases x band multiplier, rounded down to SAR 1,000. */
  limitSar: number;
  /** Limit capped at what the contractor asked for. */
  approvedCapSar: number;
}

export type Decision = 'approve' | 'approve_with_conditions' | 'refer' | 'decline';

export interface Reason {
  code: string;
  text: string;
}

export interface Assessment {
  caseId: string;
  checks: CheckResult[];
  consistency: ConsistencyResult;
  rules: PolicyRuleResult[];
  factors: FactorResult[];
  score: number;
  band: Band;
  /** True when a factor could not be assessed or a check did not run. */
  provisional: boolean;
  limit: LimitResult;
  proposedDecision: Decision;
  reasons: Reason[];
  conditions: Reason[];
}

export interface ConsistencyResult {
  vatRevenueSar: number | null;
  /** Bank inflows net of 15% VAT, comparable with declared revenue. */
  bankInflowsExVatSar: number | null;
  financialsRevenueSar: number | null;
  bankVsVatDeviation: number | null;
  financialsVsVatDeviation: number | null;
  status: 'consistent' | 'minor_gap' | 'inconsistent' | 'not_assessable';
}
