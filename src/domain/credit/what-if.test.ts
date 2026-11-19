import { describe, expect, it } from "vitest";
import { assessCase } from "./engine";
import { bunyanAlHijaz, durratAlQassim, rawasiNajd } from "./samples";
import type { CreditProfile } from "./types";
import { LEVER_RANGE, applyLevers, leversOf, outcomeOf, simulate } from "./what-if";

const asOf = "2026-11-18";

describe("what-if levers", () => {
  it("reads today's levers from the file, and the unchanged levers reproduce today's outcome", () => {
    const w = leversOf(durratAlQassim);
    expect(w).toMatchObject({ vatReconciled: true, simahScore: 720, returnedCheques: 1, yearsTrading: 6 });
    const { current, simulated } = simulate(durratAlQassim, asOf, w);
    expect(simulated).toEqual(current);
    const a = assessCase(durratAlQassim, asOf);
    expect(current).toMatchObject({ score: a.score, band: a.band, decision: a.proposedDecision });
  });

  it("matches a real assessment of the edited file (the simulation cannot drift from the engine)", () => {
    const w = { ...leversOf(durratAlQassim), simahScore: 600, returnedCheques: 4 };
    expect(outcomeOf(applyLevers(durratAlQassim, w), asOf).score).toBe(assessCase(applyLevers(durratAlQassim, w), asOf).score);
  });

  it("moves the score in the expected direction for each lever", () => {
    const base = leversOf(durratAlQassim);
    const score = (patch: Partial<typeof base>) => simulate(durratAlQassim, asOf, { ...base, ...patch }).simulated.score;
    const now = score({});
    expect(score({ simahScore: 820 })).toBeGreaterThan(now);
    expect(score({ simahScore: 520 })).toBeLessThan(now);
    expect(score({ overdueShare: 0.25 })).toBeLessThan(now);
    expect(score({ returnedCheques: 5 })).toBeLessThan(now);
    expect(score({ yearsTrading: 15 })).toBeGreaterThan(now);
  });

  it("reconciling revenue turns an inconsistent file from refer into a decision", () => {
    const mismatched: CreditProfile = { ...rawasiNajd, bank: { ...rawasiNajd.bank!, annualInflowsSar: Math.round(rawasiNajd.bank!.annualInflowsSar * 0.55) } };
    const w = leversOf(mismatched);
    expect(w.vatReconciled).toBe(false);
    const { current, simulated } = simulate(mismatched, asOf, { ...w, vatReconciled: true });
    expect(current.decision).toBe("refer");
    expect(current.capSar).toBe(0);
    expect(simulated.decision).toBe("approve");
    expect(simulated.capSar).toBeGreaterThan(0);
  });

  it("prices by band: Murabaha profit rate for the tenor and its APR, none for band D", () => {
    const { current } = simulate(rawasiNajd, asOf, leversOf(rawasiNajd));
    expect(current.band).toBe("A");
    expect(current.profitRate).toBeCloseTo(0.025, 6);
    expect(current.apr).toBeCloseTo((0.025 * 365) / 60, 6);
    const declined = simulate(bunyanAlHijaz, asOf, leversOf(bunyanAlHijaz)).current;
    expect(declined.band).toBe("D");
    expect(declined.profitRate).toBeNull();
    expect(declined.capSar).toBe(0);
  });

  it("clamps levers to their ranges and never mutates the profile", () => {
    const before = JSON.stringify(durratAlQassim);
    const p = applyLevers(durratAlQassim, { vatReconciled: true, simahScore: 9999, overdueShare: 5, returnedCheques: -3, yearsTrading: 99 });
    expect(p.simah.report?.score).toBe(LEVER_RANGE.simahScore.max);
    expect(p.bank?.returnedCheques).toBe(0);
    expect(p.applicant.yearsTrading).toBe(LEVER_RANGE.yearsTrading.max);
    expect(JSON.stringify(durratAlQassim)).toBe(before);
  });
});
