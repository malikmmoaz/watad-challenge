import { checkConsistency, runGatedChecks } from './checks';
import { bandFor, scoreFactors, topPayerShare, totalScore } from './scorecard';
import type { Assessment, Band, CreditProfile, Decision, LimitResult, PolicyRuleResult, Reason } from './types';

export const BAND_MULTIPLIER: Record<Band, number> = { A: 1, B: 0.75, C: 0.5, D: 0 };
export const POLICY = { minYearsTrading: 2, maxTenorDays: 90, maxPayerShare: 0.7 } as const;

/**
 * Limit = lowest of 10% of net worth, 10% of working capital and
 * monthly purchases x term/30, adjusted by band, rounded down to SAR 1,000.
 */
export function computeLimit(c: CreditProfile, band: Band): LimitResult {
  const f = c.financials;
  const netWorth = Math.max(0, Math.floor((f?.netWorthSar ?? 0) * 0.1));
  const workingCapital = Math.max(0, Math.floor(((f?.currentAssetsSar ?? 0) - (f?.currentLiabilitiesSar ?? 0)) * 0.1));
  const purchases = Math.max(0, Math.floor((c.monthlyPurchasesSar * c.request.tenorDays) / 30));
  const baseSar = Math.min(netWorth, workingCapital, purchases);
  const binding: LimitResult['binding'] =
    baseSar === workingCapital ? 'working_capital' : baseSar === netWorth ? 'net_worth' : 'purchases';
  const bandMultiplier = BAND_MULTIPLIER[band];
  const limitSar = Math.floor((baseSar * bandMultiplier) / 1000) * 1000;
  return {
    tenPctNetWorthSar: netWorth,
    tenPctWorkingCapitalSar: workingCapital,
    purchasesOverTermSar: purchases,
    binding,
    baseSar,
    bandMultiplier,
    limitSar,
    approvedCapSar: Math.min(limitSar, c.request.capSar),
  };
}

const sar = (n: number): string => `SAR ${n.toLocaleString('en-US')}`;

export function evaluatePolicy(c: CreditProfile, limit: LimitResult, asOf: string): PolicyRuleResult[] {
  const top = topPayerShare(c);
  const zakatOk = !!c.zakat && c.zakat.validUntil >= asOf;
  const gosiOk = !!c.gosi && c.gosi.validUntil >= asOf;
  const defaultSar = c.simah.report?.unsettledDefaultSar ?? 0;
  return [
    {
      id: 'P1',
      label: `At least ${POLICY.minYearsTrading} years trading`,
      effect: 'decline',
      breached: c.applicant.yearsTrading < POLICY.minYearsTrading,
      detail: `${c.applicant.yearsTrading} years trading.`,
    },
    {
      id: 'P2',
      label: 'No unsettled SIMAH default',
      effect: 'decline',
      breached: defaultSar > 0,
      detail: defaultSar > 0 ? `Unsettled default of ${sar(defaultSar)}.` : 'None reported.',
    },
    {
      id: 'P3',
      label: `Tenor up to ${POLICY.maxTenorDays} days`,
      effect: 'refer',
      breached: c.request.tenorDays > POLICY.maxTenorDays,
      detail: `${c.request.tenorDays} days requested.`,
    },
    {
      id: 'P4',
      label: 'Zakat certificate in date',
      effect: 'refer',
      breached: !zakatOk,
      detail: zakatOk ? `Valid until ${c.zakat?.validUntil}.` : 'Missing or expired.',
    },
    {
      id: 'P5',
      label: 'GOSI certificate in date',
      effect: 'refer',
      breached: !gosiOk,
      detail: gosiOk ? `Valid until ${c.gosi?.validUntil}.` : 'Missing or expired.',
    },
    {
      id: 'P6',
      label: 'No document tamper flags',
      effect: 'refer',
      breached: c.tamperFlags.length > 0,
      detail: c.tamperFlags.length > 0 ? c.tamperFlags.map((t) => t.note).join(' ') : 'No flags raised.',
    },
    {
      id: 'P7',
      label: `No single payer above ${POLICY.maxPayerShare * 100}% of backlog`,
      effect: 'condition',
      breached: top > POLICY.maxPayerShare,
      detail: `Largest payer is ${Math.round(top * 100)}% of backlog.`,
    },
    {
      id: 'P8',
      label: 'Requested cap within computed limit',
      effect: 'condition',
      breached: c.request.capSar > limit.limitSar,
      detail: `Requested ${sar(c.request.capSar)}; computed limit ${sar(limit.limitSar)}.`,
    },
    {
      id: 'P9',
      label: 'Audited financial statements',
      effect: 'condition',
      breached: c.financials !== null && !c.financials.audited,
      detail: c.financials?.audited ? 'Audited.' : 'Not audited.',
    },
  ];
}

const CONDITION_TEXT: Record<string, (c: CreditProfile, l: LimitResult) => string> = {
  P7: () => 'Assignment of proceeds from the largest payer contract to the repayment account.',
  P8: (_c, l) => `Credit cap set at the computed limit of ${sar(l.limitSar)}, below the amount requested.`,
  P9: () => 'Audited financial statements to be provided within 90 days.',
};

/** Full, deterministic assessment of one case. `asOf` is passed in so the engine never reads the clock. */
export function assessCase(c: CreditProfile, asOf: string): Assessment {
  const checks = runGatedChecks(c, asOf);
  const factors = scoreFactors(c, asOf);
  const score = totalScore(factors);
  const band = bandFor(score);
  const limit = computeLimit(c, band);
  const rules = evaluatePolicy(c, limit, asOf);
  const provisional = factors.some((f) => !f.assessed) || checks.some((k) => k.status === 'skipped' || k.failKind === 'incomplete');

  const failed = checks.filter((k) => k.status === 'fail');
  const adverse: Reason[] = [
    ...failed.filter((k) => k.failKind === 'adverse').map((k) => ({ code: `CHECK_${k.id.toUpperCase()}`, text: k.findings.join(' ') })),
    ...rules.filter((r) => r.breached && r.effect === 'decline').map((r) => ({ code: r.id, text: `${r.label}: ${r.detail}` })),
  ];
  const incomplete: Reason[] = [
    ...failed.filter((k) => k.failKind === 'incomplete').map((k) => ({ code: `CHECK_${k.id.toUpperCase()}`, text: k.findings.join(' ') })),
    ...rules.filter((r) => r.breached && r.effect === 'refer').map((r) => ({ code: r.id, text: `${r.label}: ${r.detail}` })),
  ];
  const conditions: Reason[] = rules
    .filter((r) => r.breached && r.effect === 'condition')
    .map((r) => ({ code: r.id, text: CONDITION_TEXT[r.id]?.(c, limit) ?? r.label }));
  if (band === 'C') conditions.push({ code: 'BAND_C', text: 'Band C: cap reviewed after the first three repaid purchase orders.' });

  let proposedDecision: Decision;
  let reasons: Reason[];
  if (adverse.length > 0) {
    proposedDecision = 'decline';
    reasons = adverse;
  } else if (incomplete.length > 0) {
    proposedDecision = 'refer';
    reasons = incomplete;
  } else if (band === 'D') {
    proposedDecision = 'decline';
    reasons = [{ code: 'BAND_D', text: `Score ${score} is below the minimum of 50 for a credit cap.` }];
  } else if (limit.limitSar <= 0) {
    proposedDecision = 'decline';
    reasons = [{ code: 'NO_CAPACITY', text: 'Net worth and working capital do not support a credit cap.' }];
  } else {
    proposedDecision = conditions.length > 0 ? 'approve_with_conditions' : 'approve';
    reasons = [...factors]
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
      .map((f) => ({ code: `FACTOR_${f.id.toUpperCase()}`, text: `${f.label}: ${f.detail}` }));
  }
  if (proposedDecision === 'decline') {
    // Weakest factors travel with a decline so the contractor knows what to fix.
    const weakest = [...factors]
      .filter((f) => f.assessed)
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 2)
      .map((f) => ({ code: `FACTOR_${f.id.toUpperCase()}`, text: `${f.label}: ${f.detail}` }));
    reasons = [...reasons, ...weakest];
  }

  return {
    caseId: c.id,
    checks,
    consistency: checkConsistency(c),
    rules,
    factors,
    score,
    band,
    provisional,
    limit,
    proposedDecision,
    reasons,
    conditions: proposedDecision === 'approve_with_conditions' ? conditions : [],
  };
}
