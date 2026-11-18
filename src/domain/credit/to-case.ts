/**
 * Bridges the pure engine (CreditProfile -> Assessment) and the shared domain
 * record (CreditCase) the UI and store use. Pure; ids and the clock are inputs.
 */
import { formatSar, sar } from "../money";
import type {
  AiCreditProposal,
  CreditDocument,
  CreditDocumentType,
  CreditDecisionOutcome,
  DocumentFinding,
  DocumentId,
  EvidenceRef,
  ExtractedField,
  GatedCheck,
  PolicyCheck,
  ReasonCode,
  ScoreFactor,
  ScoreFactorId,
  Scorecard,
  SimulatedAi,
} from "../types";
import type { Assessment, CreditProfile, Decision, DocKey, FactorId } from "./types";

export const DOC_TYPE: Record<DocKey, CreditDocumentType> = {
  cr: "cr",
  vat_returns: "vat_returns",
  zakat_certificate: "zakat_certificate",
  simah_report: "simah_report",
  financials_qawaem: "audited_financials",
  bank_statements: "bank_statements",
  gosi_certificate: "gosi_certificate",
  contractor_classification: "classification_certificate",
  contracts_in_hand: "contracts_in_hand",
};

const FACTOR_ID: Record<FactorId, ScoreFactorId> = {
  liquidity: "liquidity",
  payment_history: "payment_history",
  payer_quality: "payer_quality",
  leverage_profitability: "leverage_profitability",
  backlog_capacity: "backlog_capacity",
  wip_health: "wip_health",
  bank_behaviour: "bank_cashflow",
  concentration: "concentration",
  track_record: "track_record",
  compliance_disputes: "compliance",
};

/** Field each factor or check points at first, per document. */
const PRIMARY_FIELD: Record<DocKey, string> = {
  cr: "cr_status",
  vat_returns: "vat_revenue_12m",
  zakat_certificate: "zakat_valid_until",
  simah_report: "simah_score",
  financials_qawaem: "fin_revenue",
  bank_statements: "bank_inflows_12m",
  gosi_certificate: "gosi_valid_until",
  contractor_classification: "class_grade",
  contracts_in_hand: "contracts_backlog",
};

export const docId = (caseId: string, key: DocKey): DocumentId => `${caseId}_${DOC_TYPE[key]}` as DocumentId;

const evidenceFor = (caseId: string, keys: DocKey[]): EvidenceRef[] =>
  keys.map((k) => ({ documentId: docId(caseId, k), fieldKey: PRIMARY_FIELD[k] }));

const ai = (agent: string, confidence: number): SimulatedAi => ({ simulated: true, agent, confidence });
const money = (n: number) => formatSar(sar(n));

/**
 * Simulated document reading: the extracted fields a document model would return.
 * Confidence drops where the case carries a tamper flag on that document.
 */
export function simulateDocuments(p: CreditProfile, caseId: string, uploadedAt: string): CreditDocument[] {
  const flagged = new Set(p.tamperFlags.map((t) => t.doc));
  const f = (key: DocKey, fields: [string, string, string, string][]): ExtractedField[] =>
    fields.map(([k, label, value, location]) => ({ key: k, label, value, location, confidence: flagged.has(key) ? 0.62 : 0.95 }));
  const backlog = p.contracts.reduce((s, k) => s + k.remainingSar, 0);
  const fields: Record<DocKey, ExtractedField[]> = {
    cr: f("cr", p.cr ? [["cr_number", "CR number", p.applicant.crNumber, "p.1, header"], ["cr_status", "Status", p.cr.status, "p.1, status box"], ["cr_expiry", "Expires", p.cr.expiresOn, "p.1, validity"]] : []),
    vat_returns: f("vat_returns", p.vat ? [["vat_revenue_12m", "Declared taxable sales, last 4 quarters", money(p.vat.annualRevenueSar), "Returns 1-4, box 1 total"], ["vat_late", "Late filings, 12 months", String(p.vat.lateFilings), "ZATCA filing history"]] : []),
    bank_statements: f("bank_statements", p.bank ? [
      ["bank_inflows_12m", "Total inflows, annualised (incl. VAT)", money(p.bank.annualInflowsSar), "Monthly summary, all pages"],
      ["bank_months", "Months provided", String(p.bank.monthsProvided), "Statement periods"],
      ["bank_avg_balance", "Average daily balance", money(p.bank.avgBalanceSar), "Computed from daily balances"],
      ["bank_returned_items", "Returned cheques", String(p.bank.returnedCheques), "Transaction scan"],
      ["bank_negative_days", "Days overdrawn", String(p.bank.negativeBalanceDays), "Daily balances"],
    ] : []),
    financials_qawaem: f("financials_qawaem", p.financials ? [
      ["fin_revenue", "Revenue", money(p.financials.revenueSar), "Income statement, line 1"],
      ["fin_net_profit", "Net profit", money(p.financials.netProfitSar), "Income statement, bottom line"],
      ["fin_current_assets", "Current assets", money(p.financials.currentAssetsSar), "Balance sheet"],
      ["fin_current_liabilities", "Current liabilities", money(p.financials.currentLiabilitiesSar), "Balance sheet"],
      ["fin_total_liabilities", "Total liabilities", money(p.financials.totalLiabilitiesSar), "Balance sheet"],
      ["fin_net_worth", "Total equity", money(p.financials.netWorthSar), "Balance sheet"],
      ["fin_audited", "Audit opinion", p.financials.audited ? "Unqualified" : "Not audited", "Auditor's report"],
    ] : []),
    simah_report: f("simah_report", p.simah.report ? [
      ["simah_score", "SIMAH score", String(p.simah.report.score), "Section 1"],
      ["simah_defaults", "Unsettled defaults", money(p.simah.report.unsettledDefaultSar), "Section 4"],
      ["simah_late_12m", "Delinquencies, 12 months", String(p.simah.report.delinquencies12m), "Section 4, table 2"],
    ] : []),
    zakat_certificate: f("zakat_certificate", p.zakat ? [["zakat_valid_until", "Valid until", p.zakat.validUntil, "p.1"]] : []),
    gosi_certificate: f("gosi_certificate", p.gosi ? [["gosi_valid_until", "Valid until", p.gosi.validUntil, "p.1"]] : []),
    contractor_classification: f("contractor_classification", p.applicant.classificationGrade ? [["class_grade", "Classification grade", `Grade ${p.applicant.classificationGrade}`, "p.1"]] : []),
    contracts_in_hand: f("contracts_in_hand", [
      ["contracts_backlog", "Remaining backlog", money(backlog), "Sum of contracts"],
      ...p.contracts.map((k, i): [string, string, string, string] => [`contract_${i + 1}`, k.payer, `${money(k.remainingSar)} remaining · retention ${k.retentionPct}%`, `Contract ${i + 1}`]),
    ]),
  };
  const all = Object.keys(DOC_TYPE) as DocKey[];
  return all.map((key): CreditDocument => {
    const provided = p.documentsProvided.includes(key);
    const findings: DocumentFinding[] = p.tamperFlags
      .filter((t) => t.doc === key)
      .map((t) => ({ severity: "critical", kind: "tamper_signal", text: t.note, relatedDocumentIds: [], ai: ai("Document forensics", 0.71) }));
    return {
      id: docId(caseId, key),
      type: DOC_TYPE[key],
      fileName: provided ? `${DOC_TYPE[key]}.pdf` : "",
      status: !provided ? "missing" : findings.length > 0 ? "flagged" : "parsed",
      uploadedAt: provided ? uploadedAt : undefined,
      extracted: provided ? fields[key] : [],
      findings,
    };
  });
}

const RESULT: Record<"pass" | "flag" | "fail" | "skipped", GatedCheck["result"]> = { pass: "pass", flag: "flag", fail: "fail", skipped: "pending" };

export function toGates(a: Assessment): GatedCheck[] {
  return a.checks.map((k) => ({
    id: k.id,
    order: k.order,
    label: k.label,
    result: RESULT[k.status],
    detail: k.findings.join(" "),
    evidence: evidenceFor(a.caseId, k.evidence),
  }));
}

export function toScorecard(a: Assessment): Scorecard {
  const factors: ScoreFactor[] = a.factors.map((f) => ({
    id: FACTOR_ID[f.id],
    label: f.label,
    weight: f.weight,
    points: f.points,
    whyItMatters: f.whyItMatters,
    rationale: f.assessed ? f.detail : `${f.detail} Scored 0 until provided.`,
    evidence: evidenceFor(a.caseId, f.evidence),
  }));
  const byRatio = [...a.factors].filter((f) => f.assessed).sort((x, y) => y.ratio - x.ratio);
  const policyChecks: PolicyCheck[] = a.rules.map((r) => ({
    id: r.id,
    rule: r.label,
    observed: r.detail,
    result: !r.breached ? "pass" : r.effect === "decline" ? "fail" : "refer",
  }));
  return {
    factors,
    // Sum of the shown points, so the card adds up; the band uses the rounded score.
    total: Math.round(factors.reduce((t, f) => t + f.points, 0) * 10) / 10,
    band: a.band,
    policyChecks,
    topFactors: [
      ...byRatio.slice(0, 2).map((f) => ({ factorId: FACTOR_ID[f.id], direction: "up" as const })),
      ...byRatio.slice(-2).reverse().map((f) => ({ factorId: FACTOR_ID[f.id], direction: "down" as const })),
    ],
    proposedCap: sar(a.limit.approvedCapSar),
    capBasis: [
      { method: "10% of net worth", amount: sar(a.limit.tenPctNetWorthSar) },
      { method: "10% of working capital", amount: sar(a.limit.tenPctWorkingCapitalSar) },
      { method: "Monthly purchases x term / 30", amount: sar(a.limit.purchasesOverTermSar) },
      { method: `Lowest, x band ${a.band} multiplier ${a.limit.bandMultiplier}`, amount: sar(a.limit.limitSar) },
    ],
  };
}

export const OUTCOME: Record<Decision, CreditDecisionOutcome> = {
  approve: "approve",
  approve_with_conditions: "approve",
  refer: "request_info",
  decline: "decline",
};

/** Maps engine reason codes onto the shared, contractor-facing reason codes. */
export function reasonCodes(a: Assessment): ReasonCode[] {
  const out = new Set<ReasonCode>();
  const codes = [...a.reasons, ...a.conditions].map((r) => r.code);
  const add = (cond: boolean, c: ReasonCode) => cond && out.add(c);
  add(codes.includes("CHECK_SIMAH") || codes.includes("P2"), "late_payments_simah");
  add(codes.includes("P6"), "document_tamper_signal");
  add(a.consistency.status === "inconsistent" || a.consistency.status === "minor_gap", "vat_bank_mismatch");
  add(a.checks.some((k) => k.failKind === "incomplete" && k.findings.some((x) => /not (provided|yet)|Only/.test(x))), "document_missing");
  add(codes.includes("P4") || codes.includes("P5"), "document_expired");
  add(codes.includes("P7"), "payer_concentration");
  const f = Object.fromEntries(a.factors.map((x) => [x.id, x.ratio]));
  add((f.liquidity ?? 0) >= 0.75, "strong_liquidity");
  add((f.liquidity ?? 1) < 0.4, "thin_liquidity");
  add((f.leverage_profitability ?? 1) < 0.4, "high_leverage");
  add((f.payment_history ?? 0) >= 0.8, "clean_payment_history");
  add((f.payer_quality ?? 0) >= 0.8, "quality_payers");
  add((f.backlog_capacity ?? 1) < 0.4, "over_extended_backlog");
  add((f.compliance_disputes ?? 1) < 0.5, "compliance_lapse");
  return [...out];
}

const DECISION_WORD: Record<Decision, string> = {
  approve: "approve",
  approve_with_conditions: "approve with conditions",
  refer: "request more information",
  decline: "decline",
};

/** Simulated AI credit memo, drafted from the assessment only. Markdown. */
export function draftMemo(p: CreditProfile, a: Assessment): string {
  const top = [...a.factors].sort((x, y) => y.ratio - x.ratio);
  const lines = [
    `**Recommendation: ${DECISION_WORD[a.proposedDecision]}${a.limit.approvedCapSar > 0 && OUTCOME[a.proposedDecision] === "approve" ? `, credit cap ${money(a.limit.approvedCapSar)}` : ""}, ${p.request.tenorDays} days, band ${a.band} (score ${a.score}${a.provisional ? ", provisional" : ""}).**`,
    "",
    `${p.applicant.name}, ${p.applicant.city}, ${p.applicant.yearsTrading} years trading, requests ${money(p.request.capSar)}.`,
    "",
    `Strengths: ${top.slice(0, 2).map((f) => `${f.label.toLowerCase()} (${f.detail})`).join("; ")}.`,
    `Weaknesses: ${top.filter((f) => f.assessed).slice(-2).map((f) => `${f.label.toLowerCase()} (${f.detail})`).join("; ")}.`,
    "",
    `Revenue consistency: ${a.consistency.status.replace("_", " ")}.`,
    `Limit: lowest of 10% net worth ${money(a.limit.tenPctNetWorthSar)}, 10% working capital ${money(a.limit.tenPctWorkingCapitalSar)} and purchases over the term ${money(a.limit.purchasesOverTermSar)}, times ${a.limit.bandMultiplier} for band ${a.band}: ${money(a.limit.limitSar)}.`,
  ];
  if (a.reasons.length > 0) lines.push("", "Reasons:", ...a.reasons.map((r) => `- ${r.text}`));
  if (a.conditions.length > 0) lines.push("", "Conditions:", ...a.conditions.map((r) => `- ${r.text}`));
  lines.push("", "_Drafted by simulated AI. A credit manager decides._");
  return lines.join("\n");
}

export function toAiProposal(p: CreditProfile, a: Assessment): AiCreditProposal {
  const outcome = OUTCOME[a.proposedDecision];
  return {
    outcome,
    proposedCap: outcome === "approve" ? sar(a.limit.approvedCapSar) : undefined,
    reasonCodes: reasonCodes(a),
    memo: draftMemo(p, a),
    ai: ai("Credit memo drafter", a.provisional ? 0.7 : 0.88),
  };
}
