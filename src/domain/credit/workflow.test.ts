import { describe, expect, it } from "vitest";
import type { CreditCase, CreditCaseId, OrgId } from "../types";
import { SAMPLE_CASES, bunyanAlHijaz, durratAlQassim, rawasiNajd, sahelAlSharq } from "./samples";
import { reasonCodes } from "./to-case";
import type { CreditProfile } from "./types";
import { availableCredit } from "./facility";
import { decide, runChecks, validateDecision, type DecisionInput } from "./workflow";

const now = "2026-11-18T12:00:00Z";
const shell = (p: CreditProfile): CreditCase => ({
  id: p.id as CreditCaseId,
  contractorId: "con_x" as OrgId,
  status: "submitted",
  requestedCap: (p.request.capSar * 100) as CreditCase["requestedCap"],
  requestedTenorDays: p.request.tenorDays as 30 | 60 | 90,
  purpose: "Materials",
  documents: [],
  gates: [],
  log: [{ at: now, actor: "contractor", action: "Application submitted" }],
  submittedAt: now,
  updatedAt: now,
  platformHistory: { posPlaced: 0, posPaidOnTime: 0, totalSpend: 0 as CreditCase["requestedCap"] },
});
const run = (p: CreditProfile) => runChecks(shell(p), p, now).case;

describe("runChecks", () => {
  it("fills documents, gates, scorecard and an AI proposal, and moves to review", () => {
    const c = run(rawasiNajd);
    expect(c.status).toBe("in_assessment");
    expect(c.gates.map((g) => g.result)).toEqual(["pass", "pass", "pass", "pass", "pass"]);
    expect(c.scorecard?.factors).toHaveLength(10);
    expect(c.scorecard?.factors.reduce((s, f) => s + f.weight, 0)).toBe(100);
    expect(c.scorecard?.band).toBe("A");
    expect(c.scorecard?.proposedCap).toBe(100_000_000);
    expect(c.aiProposal).toMatchObject({ outcome: "approve", ai: { simulated: true } });
    expect(c.aiProposal?.memo).toContain("simulated AI");
    expect(c.log.at(-1)?.actor).toBe("ai_agent");
  });

  it("links every factor's evidence to an extracted field of a document on the case", () => {
    for (const p of SAMPLE_CASES) {
      const c = run(p);
      for (const f of c.scorecard?.factors ?? []) {
        for (const e of f.evidence) expect(c.documents.some((d) => d.id === e.documentId)).toBe(true);
      }
    }
  });

  it("maps the four sample outcomes", () => {
    expect([rawasiNajd, durratAlQassim, sahelAlSharq, bunyanAlHijaz].map((p) => run(p).aiProposal?.outcome)).toEqual([
      "approve",
      "approve",
      "request_info",
      "decline",
    ]);
  });

  it("marks skipped checks pending and flags tampered documents", () => {
    const c = run(sahelAlSharq);
    expect(c.gates.at(-1)?.result).toBe("pending");
    expect(c.documents.find((d) => d.type === "audited_financials")?.status).toBe("flagged");
    expect(c.documents.find((d) => d.type === "simah_report")?.status).toBe("missing");
  });

  it("derives contractor-facing reason codes", () => {
    const a = runChecks(shell(bunyanAlHijaz), bunyanAlHijaz, now).assessment;
    expect(reasonCodes(a)).toEqual(expect.arrayContaining(["late_payments_simah", "thin_liquidity"]));
  });
});

it("assesses the amount and term on the application, not the profile's", () => {
  const c = { ...shell(rawasiNajd), requestedCap: 40_000_000 as CreditCase["requestedCap"], requestedTenorDays: 30 as const };
  const { case: done, assessment } = runChecks(c, rawasiNajd, now);
  expect(done.aiProposal?.proposedCap).toBe(40_000_000);
  expect(assessment.limit.purchasesOverTermSar).toBe(1_800_000);
});

describe("decide", () => {
  const approve: DecisionInput = {
    outcome: "approve",
    decidedBy: "Reem Al-Harbi (fictional)",
    reasonCodes: ["strong_liquidity"],
    reasonText: "Strong liquidity and government-backed backlog.",
    approvedCapSar: 1_000_000,
  };

  it("approves and opens a facility with the Murabaha profit rate for the term", () => {
    const { case: c, facility } = decide(run(rawasiNajd), approve, now);
    expect(c.status).toBe("approved");
    expect(c.decision).toMatchObject({ outcome: "approve", approvedCap: 100_000_000, overrodeAi: false });
    expect(facility).toMatchObject({ cap: 100_000_000, drawn: 0, band: "A", maxTenorDays: 60, profitRate: 0.025 });
    expect(c.log.at(-1)).toMatchObject({ actor: "credit_manager", action: "Approved" });
  });

  it("carries outstanding draws into a replacement facility", () => {
    const current = decide(run(rawasiNajd), approve, now).facility!;
    const withDraws = { ...current, drawn: 30_000_000 as typeof current.drawn };
    const higher = decide(run(rawasiNajd), { ...approve, approvedCapSar: 800_000 }, now, withDraws).facility!;
    expect(higher).toMatchObject({ cap: 80_000_000, drawn: 30_000_000 });
    expect(availableCredit(higher)).toBe(50_000_000);
    const below = decide(run(rawasiNajd), { ...approve, approvedCapSar: 200_000 }, now, withDraws).facility!;
    expect(below).toMatchObject({ drawn: 30_000_000 });
    expect(availableCredit(below)).toBe(0);
  });

  it("requests more information with the items listed", () => {
    const { case: c, facility } = decide(
      run(sahelAlSharq),
      { outcome: "request_info", decidedBy: "R", reasonCodes: ["document_tamper_signal"], reasonText: "Revenue in the financials does not match VAT.", requestedItems: ["Qawaem filing reference"] },
      now,
    );
    expect(c.status).toBe("more_info_requested");
    expect(c.decision?.requestedItems).toEqual(["Qawaem filing reference"]);
    expect(facility).toBeUndefined();
  });

  it("requires a reason to override the AI and blocks bad input", () => {
    const declineCase = run(bunyanAlHijaz);
    expect(validateDecision(declineCase, { ...approve, approvedCapSar: 100_000 })).toContain("Explain why you are departing from the AI proposal.");
    expect(validateDecision(run(rawasiNajd), { ...approve, approvedCapSar: 5_000_000 })).toContain("The approved cap cannot exceed the amount requested.");
    expect(validateDecision(shell(rawasiNajd), approve)).toContain("Run the checks before deciding.");
    const overridden = decide(declineCase, { ...approve, approvedCapSar: 100_000, overrideReason: "Default settled yesterday, letter on file." }, now).case;
    expect(overridden.decision).toMatchObject({ overrodeAi: true, overrideReason: "Default settled yesterday, letter on file." });
  });
});

describe("seeded queue", async () => {
  const { seedState, creditProfiles } = await import("@/data");
  it("every case in the queue can be assessed and keeps the seed invariants", () => {
    for (const c of seedState.creditCases.filter((x) => x.status === "submitted" || x.status === "in_assessment")) {
      const p = creditProfiles[c.contractorId];
      expect(p, c.contractorId).toBeDefined();
      const done = runChecks(c, p!, now).case;
      const card = done.scorecard!;
      expect(card.factors.reduce((s, f) => s + f.points, 0)).toBeCloseTo(card.total, 5);
      for (const ref of [...done.gates.flatMap((g) => g.evidence), ...card.factors.flatMap((f) => f.evidence)]) {
        expect(done.documents.find((d) => d.id === ref.documentId)?.extracted.some((f) => f.key === ref.fieldKey)).toBe(true);
      }
    }
  });
  it("gives the seeded contractors the intended proposals", () => {
    const by = (id: string) => runChecks(seedState.creditCases.find((c) => c.id === id)!, creditProfiles[seedState.creditCases.find((c) => c.id === id)!.contractorId]!, now);
    expect(by("cc_502").case.aiProposal?.outcome).toBe("request_info");
    expect(by("cc_503").assessment.proposedDecision).toBe("approve_with_conditions");
  });
});

describe("factor impact", async () => {
  const { factorImpacts } = await import("./impact");
  it("shows how each factor moves score, band and limit", () => {
    const c = run(durratAlQassim);
    const impacts = factorImpacts(c.scorecard!, c.requestedCap);
    expect(impacts).toHaveLength(10);
    for (const i of impacts) {
      expect(i.atFull.score).toBeGreaterThanOrEqual(i.current.score);
      expect(i.atZero.score).toBeLessThanOrEqual(i.current.score);
      expect(i.atFull.limit).toBeGreaterThanOrEqual(i.atZero.limit);
    }
    const liquidity = impacts.find((i) => i.factorId === "liquidity")!;
    expect(liquidity.current).toMatchObject({ band: "B", limit: 18_000_000 });
    expect(liquidity.atZero.band).toBe("C");
    expect(liquidity.atZero.limit).toBeLessThan(liquidity.current.limit);
  });
});

it("requires a reason for approve, refer and decline alike", () => {
  const c = run(rawasiNajd);
  for (const outcome of ["approve", "request_info", "decline"] as const) {
    const errors = validateDecision(c, { outcome, decidedBy: "R", reasonCodes: [], reasonText: " ", approvedCapSar: 100_000, requestedItems: ["x"], overrideReason: "Manager judgement on this file." });
    expect(errors, outcome).toContain("Write the reason the contractor will read (at least 15 characters).");
  }
});

it("seeds valid ISO timestamps on every credit case and log entry", async () => {
  const { seedState } = await import("@/data");
  for (const c of seedState.creditCases) {
    for (const iso of [c.submittedAt, c.updatedAt, ...c.log.map((l) => l.at)].filter(Boolean)) {
      expect(Number.isNaN(Date.parse(iso!)), `${c.id} ${iso}`).toBe(false);
    }
  }
});
