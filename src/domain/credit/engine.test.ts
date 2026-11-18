import { describe, expect, it } from 'vitest';
import { checkConsistency, runGatedChecks } from './checks';
import { assessCase, computeLimit } from './engine';
import { availableCap, quoteMurabaha } from './murabaha';
import { SAMPLE_AS_OF, SAMPLE_CASES, bunyanAlHijaz, durratAlQassim, rawasiNajd, sahelAlSharq } from './samples';
import { FACTORS, bandFor, scale, scoreFactors } from './scorecard';
import type { CreditCase } from './types';

const asOf = SAMPLE_AS_OF;
const withCase = (base: CreditCase, patch: Partial<CreditCase>): CreditCase => ({ ...base, ...patch });

describe('scale', () => {
  const pts = [[0, 0], [10, 1]] as const;
  it('interpolates and clamps', () => {
    expect(scale(-5, pts)).toBe(0);
    expect(scale(5, pts)).toBe(0.5);
    expect(scale(99, pts)).toBe(1);
  });
});

describe('scorecard', () => {
  it('has 10 factors whose weights sum to 100', () => {
    expect(FACTORS).toHaveLength(10);
    expect(FACTORS.reduce((s, f) => s + f.weight, 0)).toBe(100);
  });

  it('uses the agreed weights', () => {
    expect(Object.fromEntries(FACTORS.map((f) => [f.id, f.weight]))).toEqual({
      liquidity: 15,
      payment_history: 15,
      payer_quality: 12,
      leverage_profitability: 10,
      backlog_capacity: 10,
      wip_health: 10,
      bank_behaviour: 10,
      concentration: 8,
      track_record: 5,
      compliance_disputes: 5,
    });
  });

  it('keeps every factor within its weight and explains it', () => {
    for (const c of SAMPLE_CASES) {
      for (const f of scoreFactors(c, asOf)) {
        expect(f.points).toBeGreaterThanOrEqual(0);
        expect(f.points).toBeLessThanOrEqual(f.weight);
        expect(f.whyItMatters.length).toBeGreaterThan(20);
        expect(f.evidence.length).toBeGreaterThan(0);
      }
    }
  });

  it('scores an unassessable factor zero and marks it', () => {
    const f = scoreFactors(sahelAlSharq, asOf).find((x) => x.id === 'payment_history');
    expect(f).toMatchObject({ assessed: false, points: 0 });
  });

  it('maps scores to bands at the boundaries', () => {
    expect([80, 79, 65, 64, 50, 49].map(bandFor)).toEqual(['A', 'B', 'B', 'C', 'C', 'D']);
  });

  it('is deterministic', () => {
    expect(assessCase(rawasiNajd, asOf)).toEqual(assessCase(rawasiNajd, asOf));
  });
});

describe('gated checks', () => {
  it('runs cheapest first, SIMAH last', () => {
    const checks = runGatedChecks(rawasiNajd, asOf);
    expect(checks.map((k) => k.id)).toEqual(['cr', 'vat', 'bank', 'financials', 'simah']);
    expect(checks.every((k) => k.status === 'pass')).toBe(true);
  });

  it('stops at the first failure and skips the costlier checks', () => {
    const checks = runGatedChecks(withCase(rawasiNajd, { cr: { status: 'suspended', expiresOn: '2028-01-01' } }), asOf);
    expect(checks.map((k) => k.status)).toEqual(['fail', 'skipped', 'skipped', 'skipped', 'skipped']);
    expect(checks[0]?.failKind).toBe('adverse');
    expect(checks.slice(1).every((k) => k.costSar === 0)).toBe(true);
  });

  it('treats a missing document as incomplete, not adverse', () => {
    const checks = runGatedChecks(withCase(rawasiNajd, { documentsProvided: ['cr'] }), asOf);
    expect(checks[1]).toMatchObject({ id: 'vat', status: 'fail', failKind: 'incomplete' });
  });

  it('flags a CR close to expiry', () => {
    const checks = runGatedChecks(withCase(rawasiNajd, { cr: { status: 'active', expiresOn: '2026-12-10' } }), asOf);
    expect(checks[0]?.status).toBe('flag');
  });

  it('compares bank inflows net of VAT with declared revenue', () => {
    const r = checkConsistency(rawasiNajd);
    expect(r.bankInflowsExVatSar).toBe(Math.round(54_900_000 / 1.15));
    expect(r.status).toBe('consistent');
    expect(checkConsistency(sahelAlSharq).status).toBe('inconsistent');
  });
});

describe('limit', () => {
  it('takes the lowest of the three bases, adjusted by band', () => {
    const l = computeLimit(rawasiNajd, 'A');
    expect(l).toMatchObject({
      tenPctNetWorthSar: 1_600_000,
      tenPctWorkingCapitalSar: 1_000_000,
      purchasesOverTermSar: 3_600_000,
      binding: 'working_capital',
      limitSar: 1_000_000,
    });
    expect(computeLimit(rawasiNajd, 'B').limitSar).toBe(750_000);
    expect(computeLimit(rawasiNajd, 'C').limitSar).toBe(500_000);
    expect(computeLimit(rawasiNajd, 'D').limitSar).toBe(0);
  });

  it('never exceeds the requested cap and floors negative working capital at zero', () => {
    expect(computeLimit(withCase(rawasiNajd, { request: { capSar: 200_000, tenorDays: 60 } }), 'A').approvedCapSar).toBe(200_000);
    expect(computeLimit(bunyanAlHijaz, 'A').limitSar).toBe(0);
  });

  it('is bound by purchases over the term when that is lowest', () => {
    const l = computeLimit(withCase(rawasiNajd, { monthlyPurchasesSar: 300_000, request: { capSar: 1_000_000, tenorDays: 30 } }), 'A');
    expect(l).toMatchObject({ binding: 'purchases', limitSar: 300_000 });
  });
});

describe('sample cases', () => {
  it('strong approve: Rawasi Najd', () => {
    const a = assessCase(rawasiNajd, asOf);
    expect(a.band).toBe('A');
    expect(a.proposedDecision).toBe('approve');
    expect(a.provisional).toBe(false);
    expect(a.limit.approvedCapSar).toBe(1_000_000);
    expect(a.reasons).toHaveLength(3);
  });

  it('approve with conditions: Durrat Al-Qassim', () => {
    const a = assessCase(durratAlQassim, asOf);
    expect(a.band).toBe('B');
    expect(a.proposedDecision).toBe('approve_with_conditions');
    expect(a.conditions.map((c) => c.code)).toEqual(['P7', 'P8']);
    expect(a.limit.approvedCapSar).toBe(180_000);
  });

  it('refer: Sahel Al-Sharq', () => {
    const a = assessCase(sahelAlSharq, asOf);
    expect(a.proposedDecision).toBe('refer');
    expect(a.provisional).toBe(true);
    expect(a.checks.map((k) => k.status)).toEqual(['pass', 'pass', 'pass', 'fail', 'skipped']);
    expect(a.reasons.map((r) => r.code)).toEqual(['CHECK_FINANCIALS', 'P5', 'P6']);
  });

  it('decline: Bunyan Al-Hijaz', () => {
    const a = assessCase(bunyanAlHijaz, asOf);
    expect(a.band).toBe('D');
    expect(a.proposedDecision).toBe('decline');
    expect(a.reasons.map((r) => r.code)).toEqual(expect.arrayContaining(['CHECK_SIMAH', 'P2']));
    expect(a.conditions).toEqual([]);
  });

  it('declines an otherwise strong applicant under two years trading', () => {
    const young = withCase(rawasiNajd, { applicant: { ...rawasiNajd.applicant, yearsTrading: 1 } });
    expect(assessCase(young, asOf).proposedDecision).toBe('decline');
  });
});

describe('murabaha', () => {
  it('quotes a fixed markup and its APR', () => {
    const q = quoteMurabaha(100_000, 60, 'A');
    expect(q.markupSar).toBe(2_500);
    expect(q.totalRepayableSar).toBe(102_500);
    expect(q.apr).toBeCloseTo(0.1521, 4);
  });

  it('prices weaker bands higher and rejects bad input', () => {
    expect(quoteMurabaha(100_000, 30, 'C').markupSar).toBeGreaterThan(quoteMurabaha(100_000, 30, 'A').markupSar);
    expect(() => quoteMurabaha(0, 30, 'A')).toThrow(RangeError);
  });

  it('computes the cap still available', () => {
    expect(availableCap(180_000, 50_000)).toBe(130_000);
    expect(availableCap(180_000, 200_000)).toBe(0);
  });
});
