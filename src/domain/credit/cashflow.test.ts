import { describe, expect, it } from "vitest";
import { annotate, lastTwelveMonths, monthlyCashflow } from "./cashflow";
import { bunyanAlHijaz, durratAlQassim, rawasiNajd } from "./samples";

const asOf = "2026-11-18";

describe("monthly cash flow", () => {
  it("covers the twelve months before the date, oldest first", () => {
    expect(lastTwelveMonths(asOf)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(lastTwelveMonths("2026-01-05")[11]).toBe("2025-12");
  });

  it("reproduces the extracted annual figures exactly", () => {
    for (const p of [rawasiNajd, durratAlQassim, bunyanAlHijaz]) {
      const months = monthlyCashflow(p, asOf);
      expect(months).toHaveLength(12);
      expect(months.reduce((s, m) => s + m.inflowSar, 0)).toBe(p.bank!.annualInflowsSar);
      expect(Math.abs(months.reduce((s, m) => s + m.closingSar, 0) / 12 - p.bank!.avgBalanceSar)).toBeLessThan(1);
      expect(months.reduce((s, m) => s + m.returnedCheques, 0)).toBe(p.bank!.returnedCheques);
      for (const m of months) expect(m.inflowSar).toBeGreaterThan(0);
    }
  });

  it("is deterministic per case and differs between cases", () => {
    expect(monthlyCashflow(durratAlQassim, asOf)).toEqual(monthlyCashflow(durratAlQassim, asOf));
    expect(monthlyCashflow(durratAlQassim, asOf, "cc_512")).not.toEqual(monthlyCashflow(durratAlQassim, asOf, "cc_999"));
  });

  it("is steadier for a steady account than for an erratic one", () => {
    const cv = (xs: number[]) => {
      const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
      return Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length) / mean;
    };
    const steady = cv(monthlyCashflow(rawasiNajd, asOf).map((m) => m.inflowSar));
    const erratic = cv(monthlyCashflow(bunyanAlHijaz, asOf).map((m) => m.inflowSar));
    expect(erratic).toBeGreaterThan(steady);
  });
});

describe("annotations", () => {
  it("flags returned cheques, and an overdrawn month when overdrawn days are high", () => {
    const months = monthlyCashflow(bunyanAlHijaz, asOf);
    const notes = annotate(months, bunyanAlHijaz.bank!.negativeBalanceDays);
    expect(notes.filter((n) => n.kind === "returned_cheque").reduce((s, n) => s + n.value, 0)).toBe(4);
    expect(notes.some((n) => n.kind === "overdrawn")).toBe(true);
    for (const n of notes) {
      expect(n.month).toBe(months[n.index]!.month);
      expect(n.evidenceField).toMatch(/^bank_/);
    }
  });

  it("finds a one-off inflow on an erratic account and nothing alarming on a clean one", () => {
    const erratic = annotate(monthlyCashflow(bunyanAlHijaz, asOf), 0);
    expect(erratic.some((n) => n.kind === "one_off_inflow" && n.value >= 1.5)).toBe(true);
    const clean = annotate(monthlyCashflow(rawasiNajd, asOf), rawasiNajd.bank!.negativeBalanceDays);
    expect(clean.some((n) => n.kind === "returned_cheque" || n.kind === "overdrawn")).toBe(false);
  });

  it("returns nothing without twelve months", () => {
    expect(annotate([], 0)).toEqual([]);
    expect(monthlyCashflow({ ...rawasiNajd, bank: null }, asOf)).toEqual([]);
  });
});
