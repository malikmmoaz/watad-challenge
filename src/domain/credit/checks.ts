import type { CheckId, CheckResult, ConsistencyResult, CreditCase, DocKey, FailKind } from './types';

export const VAT_RATE = 0.15;

/** Deviation thresholds between VAT-declared revenue and the other two sources. */
export const CONSISTENCY = { minorGap: 0.15, inconsistent: 0.35 } as const;

const CHECK_META: Record<CheckId, { label: string; order: number; costSar: number; evidence: DocKey[] }> = {
  cr: { label: 'Commercial Registration', order: 1, costSar: 0, evidence: ['cr'] },
  vat: { label: 'ZATCA VAT returns', order: 2, costSar: 5, evidence: ['vat_returns'] },
  bank: { label: 'Bank statements', order: 3, costSar: 15, evidence: ['bank_statements', 'vat_returns'] },
  financials: { label: 'Audited financials (Qawaem)', order: 4, costSar: 25, evidence: ['financials_qawaem', 'vat_returns'] },
  simah: { label: 'SIMAH credit report', order: 5, costSar: 60, evidence: ['simah_report'] },
};

export const CHECK_ORDER: CheckId[] = ['cr', 'vat', 'bank', 'financials', 'simah'];

const deviation = (a: number, b: number): number => (b === 0 ? 1 : Math.abs(a - b) / b);

const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);

/** Three-way revenue check: VAT returns vs bank inflows (net of VAT) vs financial statements. */
export function checkConsistency(c: CreditCase): ConsistencyResult {
  const vat = c.vat?.annualRevenueSar ?? null;
  const bank = c.bank ? Math.round(c.bank.annualInflowsSar / (1 + VAT_RATE)) : null;
  const fin = c.financials?.revenueSar ?? null;
  const bankDev = vat !== null && bank !== null ? deviation(bank, vat) : null;
  const finDev = vat !== null && fin !== null ? deviation(fin, vat) : null;
  const devs = [bankDev, finDev].filter((d): d is number => d !== null);
  let status: ConsistencyResult['status'] = 'not_assessable';
  if (devs.length > 0) {
    const worst = Math.max(...devs);
    status = worst > CONSISTENCY.inconsistent ? 'inconsistent' : worst > CONSISTENCY.minorGap ? 'minor_gap' : 'consistent';
  }
  return {
    vatRevenueSar: vat,
    bankInflowsExVatSar: bank,
    financialsRevenueSar: fin,
    bankVsVatDeviation: bankDev,
    financialsVsVatDeviation: finDev,
    status,
  };
}

interface Outcome {
  status: 'pass' | 'flag' | 'fail';
  failKind?: FailKind;
  findings: string[];
}

const fail = (failKind: FailKind, finding: string): Outcome => ({ status: 'fail', failKind, findings: [finding] });
const fromFlags = (flags: string[], ok: string): Outcome =>
  flags.length > 0 ? { status: 'flag', findings: flags } : { status: 'pass', findings: [ok] };
const pct = (n: number): string => `${Math.round(n * 100)}%`;

type Runner = (c: CreditCase, asOf: string) => Outcome;

const RUNNERS: Record<CheckId, Runner> = {
  cr: (c, asOf) => {
    if (!c.cr || !c.documentsProvided.includes('cr')) return fail('incomplete', 'Commercial Registration not provided.');
    if (c.cr.status !== 'active') return fail('adverse', `Commercial Registration is ${c.cr.status}.`);
    const days = daysBetween(asOf, c.cr.expiresOn);
    if (days < 0) return fail('adverse', 'Commercial Registration has expired.');
    return fromFlags(days < 60 ? [`CR expires in ${days} days.`] : [], 'CR active and in date.');
  },
  vat: (c) => {
    if (!c.vat || !c.documentsProvided.includes('vat_returns')) return fail('incomplete', 'VAT returns not provided.');
    if (!c.vat.registered) return fail('adverse', 'Not registered for VAT with ZATCA.');
    return fromFlags(
      c.vat.lateFilings >= 2 ? [`${c.vat.lateFilings} late VAT filings in the last 12 months.`] : [],
      'VAT registered, filings on time.',
    );
  },
  bank: (c) => {
    if (!c.bank || !c.documentsProvided.includes('bank_statements')) return fail('incomplete', 'Bank statements not provided.');
    if (c.bank.monthsProvided < 6) return fail('incomplete', `Only ${c.bank.monthsProvided} months of statements; 6 required.`);
    const dev = checkConsistency(c).bankVsVatDeviation ?? 0;
    if (dev > CONSISTENCY.inconsistent)
      return fail('incomplete', `Bank inflows differ from VAT-declared revenue by ${pct(dev)}; explanation required.`);
    const flags: string[] = [];
    if (dev > CONSISTENCY.minorGap) flags.push(`Bank inflows differ from VAT-declared revenue by ${pct(dev)}.`);
    if (c.bank.returnedCheques >= 3) flags.push(`${c.bank.returnedCheques} returned cheques in the period.`);
    if (c.bank.negativeBalanceDays > 15) flags.push(`${c.bank.negativeBalanceDays} days overdrawn.`);
    return fromFlags(flags, 'Statements complete; inflows reconcile with VAT returns.');
  },
  financials: (c) => {
    if (!c.financials || !c.documentsProvided.includes('financials_qawaem'))
      return fail('incomplete', 'Financial statements not provided.');
    const dev = checkConsistency(c).financialsVsVatDeviation ?? 0;
    if (dev > CONSISTENCY.inconsistent)
      return fail('incomplete', `Reported revenue differs from VAT-declared revenue by ${pct(dev)}; explanation required.`);
    if (c.financials.netWorthSar <= 0) return fail('adverse', 'Negative net worth.');
    const flags: string[] = [];
    if (dev > CONSISTENCY.minorGap) flags.push(`Reported revenue differs from VAT-declared revenue by ${pct(dev)}.`);
    if (!c.financials.audited) flags.push('Financial statements are not audited.');
    if (c.financials.netProfitSar < 0) flags.push('Net loss in the latest year.');
    return fromFlags(flags, 'Audited financials reconcile with VAT returns.');
  },
  simah: (c) => {
    if (!c.simah.consent) return fail('incomplete', 'SIMAH consent not given.');
    if (!c.simah.report) return fail('incomplete', 'SIMAH report not yet retrieved.');
    const r = c.simah.report;
    if (r.unsettledDefaultSar > 0)
      return fail('adverse', `Unsettled SIMAH default of SAR ${r.unsettledDefaultSar.toLocaleString('en-US')}.`);
    const flags: string[] = [];
    if (r.score < 600) flags.push(`SIMAH score ${r.score} is below 600.`);
    if (r.delinquencies12m > 0) flags.push(`${r.delinquencies12m} delinquencies in the last 12 months.`);
    return fromFlags(flags, `SIMAH score ${r.score}, no defaults.`);
  },
};

/**
 * Runs the checks cheapest first and stops at the first failure: later, more
 * expensive checks (SIMAH last) are reported as skipped rather than paid for.
 */
export function runGatedChecks(c: CreditCase, asOf: string): CheckResult[] {
  let gateClosed = false;
  return CHECK_ORDER.map((id) => {
    const meta = { id, ...CHECK_META[id] };
    if (gateClosed) {
      return { ...meta, costSar: 0, status: 'skipped' as const, findings: ['Not run: an earlier check failed.'] };
    }
    const outcome = RUNNERS[id](c, asOf);
    if (outcome.status === 'fail') gateClosed = true;
    return { ...meta, ...outcome };
  });
}
