import type { Band, CreditCase, DocKey, FactorId, FactorResult, PayerType } from './types';

/** Piecewise-linear interpolation over [x, y] points sorted by x; clamps outside the range. */
export function scale(x: number, points: readonly (readonly [number, number])[]): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b && x <= b[0]) return a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
  }
  return last[1];
}

export const PAYER_QUALITY: Record<PayerType, number> = {
  government: 1,
  semi_government: 0.9,
  listed: 0.8,
  large_private: 0.6,
  sme: 0.35,
  individual: 0.2,
};

const CLASSIFICATION_QUALITY: Record<number, number> = { 1: 1, 2: 0.85, 3: 0.7, 4: 0.5, 5: 0.3 };

interface FactorDef {
  id: FactorId;
  label: string;
  weight: number;
  whyItMatters: string;
  evidence: DocKey[];
  /** Returns null when the inputs needed are missing. */
  assess: (c: CreditCase, asOf: string) => { ratio: number; detail: string } | null;
}

const backlog = (c: CreditCase): number => c.contracts.reduce((s, k) => s + k.remainingSar, 0);
const f1 = (n: number): string => n.toFixed(1);
const f2 = (n: number): string => n.toFixed(2);
const pct = (n: number): string => `${Math.round(n * 100)}%`;
const inDate = (validUntil: string | undefined, asOf: string): boolean => !!validUntil && validUntil >= asOf;

export const FACTORS: readonly FactorDef[] = [
  {
    id: 'liquidity',
    label: 'Liquidity',
    weight: 15,
    whyItMatters:
      'Materials are repaid from cash before the project is paid out. Current assets over current liabilities, and cash on hand against monthly purchases, show whether instalments can be met on time.',
    evidence: ['financials_qawaem', 'bank_statements'],
    assess: (c) => {
      if (!c.financials || !c.bank) return null;
      const current = c.financials.currentLiabilitiesSar > 0 ? c.financials.currentAssetsSar / c.financials.currentLiabilitiesSar : 3;
      const cover = c.monthlyPurchasesSar > 0 ? c.bank.avgBalanceSar / c.monthlyPurchasesSar : 2;
      const ratio =
        0.6 * scale(current, [[0.8, 0], [1, 0.4], [1.5, 0.8], [2, 1]]) + 0.4 * scale(cover, [[0, 0], [0.5, 0.5], [1.5, 1]]);
      return { ratio, detail: `Current ratio ${f2(current)}; average balance covers ${f1(cover)} months of purchases.` };
    },
  },
  {
    id: 'payment_history',
    label: 'Payment history (SIMAH + on-platform)',
    weight: 15,
    whyItMatters:
      'How a contractor has repaid lenders and suppliers before is the strongest single predictor of how it will repay this facility.',
    evidence: ['simah_report'],
    assess: (c) => {
      const r = c.simah.report;
      if (!r) return null;
      let simah = scale(r.score, [[550, 0], [650, 0.5], [750, 1]]) - 0.15 * r.delinquencies12m;
      if (r.unsettledDefaultSar > 0) simah = 0;
      simah = Math.max(0, simah);
      const p = c.platform;
      if (!p || p.ordersPaid < 3) return { ratio: simah, detail: `SIMAH score ${r.score}; no on-platform history yet.` };
      const platform = scale(p.avgDaysLate, [[0, 1], [7, 0.6], [30, 0]]);
      return {
        ratio: 0.7 * simah + 0.3 * platform,
        detail: `SIMAH score ${r.score}; ${p.ordersPaid} platform orders paid, ${f1(p.avgDaysLate)} days late on average.`,
      };
    },
  },
  {
    id: 'payer_quality',
    label: 'Payer quality',
    weight: 12,
    whyItMatters:
      'The contractor repays when its own clients pay. Government and listed payers pay reliably, if slowly; small private payers carry real default risk.',
    evidence: ['contracts_in_hand'],
    assess: (c) => {
      const total = backlog(c);
      if (total <= 0) return null;
      const ratio = c.contracts.reduce((s, k) => s + PAYER_QUALITY[k.payerType] * k.remainingSar, 0) / total;
      const strong = c.contracts
        .filter((k) => PAYER_QUALITY[k.payerType] >= 0.8)
        .reduce((s, k) => s + k.remainingSar, 0);
      return { ratio, detail: `${pct(strong / total)} of backlog is owed by government, semi-government or listed payers.` };
    },
  },
  {
    id: 'leverage_profitability',
    label: 'Leverage and profitability',
    weight: 10,
    whyItMatters:
      'A thin margin on top of heavy debt leaves no cushion for a delayed payment or a cost overrun; new credit would be stacked on an already stretched balance sheet.',
    evidence: ['financials_qawaem'],
    assess: (c) => {
      const f = c.financials;
      if (!f || f.revenueSar <= 0) return null;
      const debtToEquity = f.netWorthSar > 0 ? f.totalLiabilitiesSar / f.netWorthSar : 99;
      const margin = f.netProfitSar / f.revenueSar;
      const ratio =
        0.5 * scale(debtToEquity, [[0.5, 1], [1.5, 0.6], [3, 0]]) + 0.5 * scale(margin, [[-0.0001, 0], [0, 0.2], [0.05, 0.7], [0.1, 1]]);
      return { ratio, detail: `Liabilities are ${f2(debtToEquity)}x net worth; net margin ${(margin * 100).toFixed(1)}%.` };
    },
  },
  {
    id: 'backlog_capacity',
    label: 'Backlog vs capacity',
    weight: 10,
    whyItMatters:
      'Too little work in hand means no cash to repay from; far more work than the company has ever delivered means it is likely to overtrade and stall.',
    evidence: ['contracts_in_hand', 'vat_returns'],
    assess: (c) => {
      const revenue = c.vat?.annualRevenueSar ?? c.financials?.revenueSar ?? 0;
      if (revenue <= 0) return null;
      const cover = backlog(c) / revenue;
      return {
        ratio: scale(cover, [[0, 0.1], [0.5, 1], [1.5, 1], [2.5, 0.5], [4, 0.1]]),
        detail: `Backlog is ${f2(cover)}x last year's revenue (0.5x to 1.5x is the healthy range).`,
      };
    },
  },
  {
    id: 'wip_health',
    label: 'Work-in-progress health',
    weight: 10,
    whyItMatters:
      'Work done but not billed, and invoices past due, are cash the contractor is waiting for. Large gaps often hide disputes or losses on a project.',
    evidence: ['contracts_in_hand'],
    assess: (c) => {
      const value = c.contracts.reduce((s, k) => s + k.valueSar, 0);
      const revenue = c.vat?.annualRevenueSar ?? c.financials?.revenueSar ?? 0;
      if (value <= 0 || revenue <= 0) return null;
      const gap = c.contracts.reduce((s, k) => s + Math.abs(k.percentComplete - k.billedPct) * k.valueSar, 0) / value;
      const overdue = c.contracts.reduce((s, k) => s + k.overdueReceivableSar, 0) / revenue;
      const ratio = 0.5 * scale(gap, [[0, 1], [10, 0.6], [25, 0]]) + 0.5 * scale(overdue, [[0, 1], [0.1, 0.5], [0.25, 0]]);
      return { ratio, detail: `Progress and billing differ by ${f1(gap)} points; overdue receivables are ${pct(overdue)} of revenue.` };
    },
  },
  {
    id: 'bank_behaviour',
    label: 'Bank cash-flow behaviour',
    weight: 10,
    whyItMatters:
      'Returned cheques, overdrawn days and erratic inflows show how the account is actually run, month by month, whatever the annual statements say.',
    evidence: ['bank_statements'],
    assess: (c) => {
      const b = c.bank;
      if (!b) return null;
      const ratio =
        (scale(b.returnedCheques, [[0, 1], [1, 0.5], [3, 0]]) +
          scale(b.negativeBalanceDays, [[0, 1], [10, 0.5], [30, 0]]) +
          scale(b.inflowVolatility, [[0.2, 1], [0.6, 0.4], [1, 0]])) /
        3;
      return {
        ratio,
        detail: `${b.returnedCheques} returned cheques, ${b.negativeBalanceDays} overdrawn days, inflow volatility ${f2(b.inflowVolatility)}.`,
      };
    },
  },
  {
    id: 'concentration',
    label: 'Concentration',
    weight: 8,
    whyItMatters: 'When one client is most of the backlog, one delayed certificate or one dispute stops repayment.',
    evidence: ['contracts_in_hand'],
    assess: (c) => {
      const total = backlog(c);
      if (total <= 0) return null;
      const top = topPayerShare(c);
      return { ratio: scale(top, [[0.3, 1], [0.5, 0.7], [0.8, 0.2], [1, 0]]), detail: `Largest payer is ${pct(top)} of backlog.` };
    },
  },
  {
    id: 'track_record',
    label: 'Track record and classification',
    weight: 5,
    whyItMatters:
      'Years of trading and the official contractor classification grade show the company has delivered work of this size before.',
    evidence: ['cr', 'contractor_classification'],
    assess: (c) => {
      const grade = c.applicant.classificationGrade;
      const ratio =
        0.6 * scale(c.applicant.yearsTrading, [[0, 0], [2, 0.2], [5, 0.6], [10, 1]]) +
        0.4 * (grade === null ? 0.1 : (CLASSIFICATION_QUALITY[grade] ?? 0.1));
      return {
        ratio,
        detail: `${c.applicant.yearsTrading} years trading; ${grade === null ? 'not classified' : `classification grade ${grade}`}.`,
      };
    },
  },
  {
    id: 'compliance_disputes',
    label: 'Compliance and disputes',
    weight: 5,
    whyItMatters:
      'Valid Zakat and GOSI certificates and on-time VAT filings are required to be paid by government clients; open legal cases can freeze accounts.',
    evidence: ['zakat_certificate', 'gosi_certificate', 'vat_returns'],
    assess: (c, asOf) => {
      const zakat = inDate(c.zakat?.validUntil, asOf);
      const gosi = inDate(c.gosi?.validUntil, asOf);
      const late = c.vat?.lateFilings ?? 4;
      const ratio =
        (Number(zakat) + Number(gosi) + scale(late, [[0, 1], [2, 0.3], [4, 0]]) + scale(c.openLegalCases, [[0, 1], [1, 0.5], [3, 0]])) / 4;
      return {
        ratio,
        detail: `Zakat ${zakat ? 'valid' : 'missing or expired'}, GOSI ${gosi ? 'valid' : 'missing or expired'}, ${late} late VAT filings, ${c.openLegalCases} open legal cases.`,
      };
    },
  },
];

export function topPayerShare(c: CreditCase): number {
  const total = backlog(c);
  if (total <= 0) return 0;
  const byPayer = new Map<string, number>();
  for (const k of c.contracts) byPayer.set(k.payer, (byPayer.get(k.payer) ?? 0) + k.remainingSar);
  return Math.max(...byPayer.values()) / total;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function scoreFactors(c: CreditCase, asOf: string): FactorResult[] {
  return FACTORS.map(({ assess, ...def }) => {
    const r = assess(c, asOf);
    const ratio = r ? Math.min(1, Math.max(0, r.ratio)) : 0;
    return {
      ...def,
      ratio,
      points: round1(def.weight * ratio),
      pointsLost: round1(def.weight - round1(def.weight * ratio)),
      direction: ratio >= 0.5 ? ('raised' as const) : ('lowered' as const),
      assessed: r !== null,
      detail: r?.detail ?? 'Not assessed: the supporting document or check is missing.',
    };
  });
}

export const totalScore = (factors: FactorResult[]): number => Math.round(factors.reduce((s, f) => s + f.points, 0));

export const BAND_FLOORS: Record<Band, number> = { A: 80, B: 65, C: 50, D: 0 };

export function bandFor(score: number): Band {
  if (score >= BAND_FLOORS.A) return 'A';
  if (score >= BAND_FLOORS.B) return 'B';
  if (score >= BAND_FLOORS.C) return 'C';
  return 'D';
}
