import { EN, fill, type CreditLang } from './lang';
import type { CheckId, CheckResult, ConsistencyResult, CreditProfile, DocKey, FailKind } from './types';

export const VAT_RATE = 0.15;

/** Deviation thresholds between VAT-declared revenue and the other two sources. */
export const CONSISTENCY = { minorGap: 0.15, inconsistent: 0.35 } as const;

const CHECK_META: Record<CheckId, { order: number; costSar: number; evidence: DocKey[] }> = {
  cr: { order: 1, costSar: 0, evidence: ['cr'] },
  vat: { order: 2, costSar: 5, evidence: ['vat_returns'] },
  bank: { order: 3, costSar: 15, evidence: ['bank_statements', 'vat_returns'] },
  financials: { order: 4, costSar: 25, evidence: ['financials_qawaem', 'vat_returns'] },
  simah: { order: 5, costSar: 60, evidence: ['simah_report'] },
};

export const CHECK_ORDER: CheckId[] = ['cr', 'vat', 'bank', 'financials', 'simah'];

const deviation = (a: number, b: number): number => (b === 0 ? 1 : Math.abs(a - b) / b);

const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);

/** Three-way revenue check: VAT returns vs bank inflows (net of VAT) vs financial statements. */
export function checkConsistency(c: CreditProfile): ConsistencyResult {
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

type Runner = (c: CreditProfile, asOf: string, L: CreditLang) => Outcome;

const RUNNERS: Record<CheckId, Runner> = {
  cr: (c, asOf, { m }) => {
    if (!c.cr || !c.documentsProvided.includes('cr')) return fail('incomplete', m.checks.crMissing);
    if (c.cr.status !== 'active') return fail('adverse', fill(m.checks.crStatus, { status: c.cr.status }));
    const days = daysBetween(asOf, c.cr.expiresOn);
    if (days < 0) return fail('adverse', m.checks.crExpired);
    return fromFlags(days < 60 ? [fill(m.checks.crExpiresIn, { days })] : [], m.checks.crOk);
  },
  vat: (c, _asOf, { m }) => {
    if (!c.vat || !c.documentsProvided.includes('vat_returns')) return fail('incomplete', m.checks.vatMissing);
    if (!c.vat.registered) return fail('adverse', m.checks.vatNotRegistered);
    return fromFlags(
      c.vat.lateFilings >= 2 ? [fill(m.checks.vatLate, { n: c.vat.lateFilings })] : [],
      m.checks.vatOk,
    );
  },
  bank: (c, _asOf, { m, pct }) => {
    if (!c.bank || !c.documentsProvided.includes('bank_statements')) return fail('incomplete', m.checks.bankMissing);
    if (c.bank.monthsProvided < 6) return fail('incomplete', fill(m.checks.bankMonths, { n: c.bank.monthsProvided }));
    const dev = checkConsistency(c).bankVsVatDeviation ?? 0;
    if (dev > CONSISTENCY.inconsistent)
      return fail('incomplete', fill(m.checks.bankGapFail, { pct: pct(dev) }));
    const flags: string[] = [];
    if (dev > CONSISTENCY.minorGap) flags.push(fill(m.checks.bankGap, { pct: pct(dev) }));
    if (c.bank.returnedCheques >= 3) flags.push(fill(m.checks.bankReturned, { n: c.bank.returnedCheques }));
    if (c.bank.negativeBalanceDays > 15) flags.push(fill(m.checks.bankOverdrawn, { n: c.bank.negativeBalanceDays }));
    return fromFlags(flags, m.checks.bankOk);
  },
  financials: (c, _asOf, { m, pct }) => {
    if (!c.financials || !c.documentsProvided.includes('financials_qawaem'))
      return fail('incomplete', m.checks.finMissing);
    const dev = checkConsistency(c).financialsVsVatDeviation ?? 0;
    if (dev > CONSISTENCY.inconsistent)
      return fail('incomplete', fill(m.checks.finGapFail, { pct: pct(dev) }));
    if (c.financials.netWorthSar <= 0) return fail('adverse', m.checks.finNegativeWorth);
    const flags: string[] = [];
    if (dev > CONSISTENCY.minorGap) flags.push(fill(m.checks.finGap, { pct: pct(dev) }));
    if (!c.financials.audited) flags.push(m.checks.finUnaudited);
    if (c.financials.netProfitSar < 0) flags.push(m.checks.finLoss);
    return fromFlags(flags, m.checks.finOk);
  },
  simah: (c, _asOf, { m, sarShort }) => {
    if (!c.simah.consent) return fail('incomplete', m.checks.simahNoConsent);
    if (!c.simah.report) return fail('incomplete', m.checks.simahNotRetrieved);
    const r = c.simah.report;
    if (r.unsettledDefaultSar > 0)
      return fail('adverse', fill(m.checks.simahDefault, { amount: sarShort(r.unsettledDefaultSar) }));
    const flags: string[] = [];
    if (r.score < 600) flags.push(fill(m.checks.simahLowScore, { score: r.score }));
    if (r.delinquencies12m > 0) flags.push(fill(m.checks.simahDelinquencies, { n: r.delinquencies12m }));
    return fromFlags(flags, fill(m.checks.simahOk, { score: r.score }));
  },
};

/**
 * Runs the checks cheapest first and stops at the first failure: later, more
 * expensive checks (SIMAH last) are reported as skipped rather than paid for.
 */
export function runGatedChecks(c: CreditProfile, asOf: string, L: CreditLang = EN): CheckResult[] {
  let gateClosed = false;
  return CHECK_ORDER.map((id) => {
    const meta = { id, label: L.m.checks.label[id], ...CHECK_META[id] };
    if (gateClosed) {
      return { ...meta, costSar: 0, status: 'skipped' as const, findings: [L.m.checks.notRunEarlierFailed] };
    }
    const outcome = RUNNERS[id](c, asOf, L);
    if (outcome.status === 'fail') gateClosed = true;
    return { ...meta, ...outcome };
  });
}
