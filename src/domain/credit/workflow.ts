/**
 * Credit manager actions on a shared CreditCase. Pure: the clock is an input.
 * "Agents prepare, humans decide": runChecks is the simulated AI preparing the
 * file; decide is the only way a case reaches approved / declined.
 */
import { sar } from "../money";
import type { CreditBand, CreditCase, CreditDecision, EvidenceRef, CreditDecisionOutcome, CreditFacility, Halalas, ReasonCode } from "../types";
import { assessCase } from "./engine";
import { PROFIT_RATE_PER_30_DAYS } from "./murabaha";
import { simulateDocuments, toAiProposal, toGates, toScorecard } from "./to-case";
import type { CreditLang } from "./lang";
import type { Assessment, CreditProfile } from "./types";

/** Runs documents, gated checks, scorecard and the AI proposal; the case moves to review. */
export function runChecks(c: CreditCase, profile: CreditProfile, now: string): { case: CreditCase; assessment: Assessment } {
  // The application's own request wins over the figures on file.
  const p: CreditProfile = { ...profile, id: c.id, request: { capSar: c.requestedCap / 100, tenorDays: c.requestedTenorDays } };
  const assessment = assessCase(p, now.slice(0, 10));
  const parsed = simulateDocuments(p, c.id, c.submittedAt ?? now);
  // Keep the contractor's own file names where they uploaded one.
  const documents = parsed.map((d) => {
    const own = c.documents.find((x) => x.type === d.type && x.fileName);
    return own ? { ...d, fileName: own.fileName } : d;
  });
  // Evidence links only to fields the document reader actually extracted.
  const resolves = (e: EvidenceRef) => documents.some((d) => d.id === e.documentId && d.extracted.some((f) => f.key === e.fieldKey));
  const gates = toGates(assessment).map((g) => ({ ...g, evidence: g.evidence.filter(resolves) }));
  const card = toScorecard(assessment);
  const scorecard = { ...card, factors: card.factors.map((f) => ({ ...f, evidence: f.evidence.filter(resolves) })) };
  const ran = assessment.checks.filter((k) => k.status !== "skipped");
  const counts = (s: string) => ran.filter((k) => k.status === s).length;
  return {
    assessment,
    case: {
      ...c,
      status: "in_assessment",
      documents,
      gates,
      scorecard,
      aiProposal: toAiProposal(p, assessment),
      log: [
        ...c.log,
        { at: now, actor: "ai_agent", action: "Documents parsed (simulated)", detail: `${documents.reduce((s, d) => s + d.extracted.length, 0)} fields extracted` },
        {
          at: now,
          actor: "ai_agent",
          action: "Gated checks run (simulated)",
          detail: `${counts("pass")} pass, ${counts("flag")} flag, ${counts("fail")} fail${ran.length < assessment.checks.length ? `, ${assessment.checks.length - ran.length} not run` : ""}`,
        },
        { at: now, actor: "ai_agent", action: "Credit memo drafted (simulated)", detail: `Proposes ${toAiProposal(p, assessment).outcome.replace("_", " ")}` },
      ],
      updatedAt: now,
    },
  };
}

export interface DecisionInput {
  outcome: CreditDecisionOutcome;
  decidedBy: string;
  reasonCodes: ReasonCode[];
  reasonText: string;
  approvedCapSar?: number;
  conditions?: string[];
  requestedItems?: string[];
  overrideReason?: string;
}

export function validateDecision(c: CreditCase, d: DecisionInput): string[] {
  const errors: string[] = [];
  if (c.status !== "in_assessment") errors.push("Run the checks before deciding.");
  if (d.reasonText.trim().length < 15) errors.push("Write the reason the contractor will read (at least 15 characters).");
  if (d.outcome === "approve" && !(d.approvedCapSar && d.approvedCapSar > 0)) errors.push("Set the approved credit cap.");
  if (d.outcome === "approve" && d.approvedCapSar && sar(d.approvedCapSar) > c.requestedCap) errors.push("The approved cap cannot exceed the amount requested.");
  if (d.outcome === "request_info" && !(d.requestedItems && d.requestedItems.some((x) => x.trim()))) errors.push("List what the contractor must provide.");
  const ai = c.aiProposal?.outcome;
  if (ai && ai !== d.outcome && !(d.overrideReason && d.overrideReason.trim().length >= 10)) errors.push("Explain why you are departing from the AI proposal.");
  return errors;
}

const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);

/** Flat Murabaha profit rate for the full tenor (as on CreditFacility.profitRate) and its APR, by band. */
export function termsFor(band: CreditBand, tenorDays: number): { profitRate: number; apr: number } {
  const per30 = band === "D" ? PROFIT_RATE_PER_30_DAYS.C : PROFIT_RATE_PER_30_DAYS[band];
  const profitRate = Math.round(((per30 * tenorDays) / 30) * 10_000) / 10_000;
  return { profitRate, apr: (profitRate * 365) / tenorDays };
}

export interface OutcomeTerms {
  cap: Halalas;
  band: CreditBand;
  tenorDays: number;
  profitRate: number;
  apr: number;
}

/**
 * What an approved case means for the contractor: the terms before it (the latest earlier
 * approval, if any) and after it. Cap from the decision log; band and rate from each case.
 */
export function outcomeTerms(c: CreditCase, cases: CreditCase[]): { before: OutcomeTerms | null; after: OutcomeTerms } | null {
  const change = capChange(c);
  if (c.status !== "approved" || !c.decision || !change) return null;
  const termsOf = (x: CreditCase, cap: Halalas): OutcomeTerms => {
    const band = x.scorecard?.band ?? "C";
    return { cap, band, tenorDays: x.requestedTenorDays, ...termsFor(band, x.requestedTenorDays) };
  };
  const decidedAt = c.decision.decidedAt;
  const prev = cases
    .filter((x) => x.id !== c.id && x.contractorId === c.contractorId && x.status === "approved" && x.decision && x.decision.decidedAt < decidedAt)
    .sort((a, b) => b.decision!.decidedAt.localeCompare(a.decision!.decidedAt))[0];
  const capAfter = change.kind === "kept" ? change.at : change.to;
  const capBefore = change.kind === "raised" ? change.from : change.kind === "kept" ? change.at : undefined;
  return {
    before: prev && capBefore !== undefined ? termsOf(prev, capBefore) : null,
    after: termsOf(c, capAfter),
  };
}

export type CapChange = { kind: "opened"; to: Halalas } | { kind: "raised"; from: Halalas; to: Halalas } | { kind: "kept"; at: Halalas };

/** How an approved case changed the contractor's cap, read from its decision log (null when not approved). */
export function capChange(c: Pick<CreditCase, "log">): CapChange | null {
  const h = (s: string) => sar(Number(s.replace(/,/g, "")));
  for (const l of [...c.log].reverse()) {
    if (l.action !== "Approved" || !l.detail) continue;
    let r: RegExpMatchArray | null;
    if ((r = l.detail.match(/^Credit cap raised from ([\d,]+) to ([\d,]+) SAR/))) return { kind: "raised", from: h(r[1]!), to: h(r[2]!) };
    if ((r = l.detail.match(/^Credit cap kept at ([\d,]+) SAR/))) return { kind: "kept", at: h(r[1]!) };
    if ((r = l.detail.match(/^Credit cap ([\d,]+) SAR/))) return { kind: "opened", to: h(r[1]!) };
  }
  return null;
}

/**
 * Records the human decision; an approval opens the credit facility, or replaces
 * the contractor's current one. Draws still outstanding on it carry over. A new
 * approval never lowers an existing cap: approving less than the current cap
 * keeps the cap and applies the new terms (band, Murabaha rate, conditions).
 */
export function decide(c: CreditCase, d: DecisionInput, now: string, current?: CreditFacility): { case: CreditCase; facility?: CreditFacility } {
  const errors = validateDecision(c, d);
  if (errors.length > 0) throw new Error(errors.join(" "));
  const approvedCap = d.outcome === "approve" && d.approvedCapSar ? sar(d.approvedCapSar) : undefined;
  const decision: CreditDecision = {
    outcome: d.outcome,
    decidedBy: d.decidedBy,
    decidedAt: now,
    reasonCodes: d.reasonCodes,
    reasonText: d.reasonText.trim(),
    approvedCap,
    conditions: d.conditions?.filter((x) => x.trim()),
    requestedItems: d.requestedItems?.filter((x) => x.trim()),
    overrodeAi: !!c.aiProposal && c.aiProposal.outcome !== d.outcome,
    overrideReason: d.overrideReason?.trim() || undefined,
  };
  const status = d.outcome === "approve" ? "approved" : d.outcome === "decline" ? "declined" : "more_info_requested";
  const action = d.outcome === "approve" ? "Approved" : d.outcome === "decline" ? "Declined" : "More information requested";
  const sarText = (h: number) => (h / 100).toLocaleString("en-US");
  const effectiveCap = approvedCap !== undefined && current && current.cap >= approvedCap ? current.cap : approvedCap;
  const capDetail =
    approvedCap === undefined
      ? decision.reasonText
      : !current
        ? `Credit cap ${sarText(approvedCap)} SAR, ${c.requestedTenorDays} days`
        : effectiveCap! > current.cap
          ? `Credit cap raised from ${sarText(current.cap)} to ${sarText(effectiveCap!)} SAR, ${c.requestedTenorDays} days`
          : `Credit cap kept at ${sarText(current.cap)} SAR, ${c.requestedTenorDays} days`;
  const next: CreditCase = {
    ...c,
    status,
    decision,
    log: [...c.log, { at: now, actor: "credit_manager", action, detail: capDetail }],
    updatedAt: now,
  };
  if (!approvedCap) return { case: next };
  const band = c.scorecard?.band ?? "C";
  return {
    case: next,
    facility: {
      creditCaseId: c.id,
      contractorId: c.contractorId,
      cap: effectiveCap as Halalas,
      drawn: (current?.drawn ?? 0) as Halalas,
      band,
      maxTenorDays: c.requestedTenorDays,
      // Flat Murabaha profit rate for the full tenor, matching CreditFacility.profitRate.
      profitRate: termsFor(band, c.requestedTenorDays).profitRate,
      conditions: decision.conditions ?? [],
      approvedAt: now,
      reviewDue: addDays(now, 182),
    },
  };
}

/**
 * The engine's text for a case in another language. Checks store English; the
 * screens re-run the same deterministic assessment (same profile, request and
 * date the checks ran) in the reader's language. Null when the case has not
 * been scored by the engine (hand-written seed cases keep their stored text).
 */
export function localizedAssessment(c: CreditCase, profile: CreditProfile | undefined, L: CreditLang) {
  const ran = [...c.log].reverse().find((l) => l.action === "Gated checks run (simulated)");
  if (!profile || !ran || !c.scorecard) return null;
  const p: CreditProfile = { ...profile, id: c.id, request: { capSar: c.requestedCap / 100, tenorDays: c.requestedTenorDays } };
  const assessment = assessCase(p, ran.at.slice(0, 10), L);
  return {
    gates: toGates(assessment),
    scorecard: toScorecard(assessment, L),
    memo: toAiProposal(p, assessment, L).memo,
  };
}
