import { checkConsistency, runGatedChecks } from './checks';
import { EN, fill, type CreditLang } from './lang';
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


export function evaluatePolicy(c: CreditProfile, limit: LimitResult, asOf: string, L: CreditLang = EN): PolicyRuleResult[] {
  const { m, sarShort: sar } = L;
  const top = topPayerShare(c);
  const zakatOk = !!c.zakat && c.zakat.validUntil >= asOf;
  const gosiOk = !!c.gosi && c.gosi.validUntil >= asOf;
  const defaultSar = c.simah.report?.unsettledDefaultSar ?? 0;
  return [
    {
      id: 'P1',
      label: fill(m.policy.minYears, { n: POLICY.minYearsTrading }),
      effect: 'decline',
      breached: c.applicant.yearsTrading < POLICY.minYearsTrading,
      detail: fill(m.policy.yearsTrading, { n: c.applicant.yearsTrading }),
    },
    {
      id: 'P2',
      label: m.policy.noDefault,
      effect: 'decline',
      breached: defaultSar > 0,
      detail: defaultSar > 0 ? fill(m.policy.defaultOf, { amount: sar(defaultSar) }) : m.policy.noneReported,
    },
    {
      id: 'P3',
      label: fill(m.policy.maxTenor, { n: POLICY.maxTenorDays }),
      effect: 'refer',
      breached: c.request.tenorDays > POLICY.maxTenorDays,
      detail: fill(m.policy.tenorRequested, { n: c.request.tenorDays }),
    },
    {
      id: 'P4',
      label: m.policy.zakat,
      effect: 'refer',
      breached: !zakatOk,
      detail: zakatOk ? fill(m.policy.validUntil, { date: c.zakat?.validUntil ?? '' }) : m.policy.missingOrExpired,
    },
    {
      id: 'P5',
      label: m.policy.gosi,
      effect: 'refer',
      breached: !gosiOk,
      detail: gosiOk ? fill(m.policy.validUntil, { date: c.gosi?.validUntil ?? '' }) : m.policy.missingOrExpired,
    },
    {
      id: 'P6',
      label: m.policy.noTamper,
      effect: 'refer',
      breached: c.tamperFlags.length > 0,
      detail: c.tamperFlags.length > 0 ? c.tamperFlags.map((t) => t.note).join(' ') : m.policy.noFlags,
    },
    {
      id: 'P7',
      label: fill(m.policy.maxPayer, { pct: POLICY.maxPayerShare * 100 }),
      effect: 'condition',
      breached: top > POLICY.maxPayerShare,
      detail: fill(m.policy.largestPayer, { pct: Math.round(top * 100) }),
    },
    {
      id: 'P8',
      label: m.policy.capWithinLimit,
      effect: 'condition',
      breached: c.request.capSar > limit.limitSar,
      detail: fill(m.policy.requestedVsLimit, { requested: sar(c.request.capSar), limit: sar(limit.limitSar) }),
    },
    {
      id: 'P9',
      label: m.policy.audited,
      effect: 'condition',
      breached: c.financials !== null && !c.financials.audited,
      detail: c.financials?.audited ? m.policy.auditedYes : m.policy.auditedNo,
    },
  ];
}

const CONDITION_TEXT: Record<string, (l: LimitResult, L: CreditLang) => string> = {
  P7: (_l, { m }) => m.conditionText.assignProceeds,
  P8: (l, { m, sarShort }) => fill(m.conditionText.capAtLimit, { limit: sarShort(l.limitSar) }),
  P9: (_l, { m }) => m.conditionText.auditWithin90,
};

/** Full, deterministic assessment of one case. `asOf` is passed in so the engine never reads the clock. */
export function assessCase(c: CreditProfile, asOf: string, L: CreditLang = EN): Assessment {
  const checks = runGatedChecks(c, asOf, L);
  const factors = scoreFactors(c, asOf, L);
  const score = totalScore(factors);
  const band = bandFor(score);
  const limit = computeLimit(c, band);
  const rules = evaluatePolicy(c, limit, asOf, L);
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
    .map((r) => ({ code: r.id, text: CONDITION_TEXT[r.id]?.(limit, L) ?? r.label }));
  if (band === 'C') conditions.push({ code: 'BAND_C', text: L.m.conditionText.bandC });

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
    reasons = [{ code: 'BAND_D', text: fill(L.m.conditionText.bandD, { score }) }];
  } else if (limit.limitSar <= 0) {
    proposedDecision = 'decline';
    reasons = [{ code: 'NO_CAPACITY', text: L.m.conditionText.noCapacity }];
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
