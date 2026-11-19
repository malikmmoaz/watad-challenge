import { EN, fill, type CreditLang } from './lang';
import type { Band, CreditProfile, DocKey, FactorId, FactorResult, PayerType } from './types';

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
  giga_project: 0.9,
  main_contractor: 0.55,
  listed: 0.8,
  large_private: 0.6,
  sme: 0.35,
  individual: 0.2,
};

const CLASSIFICATION_QUALITY: Record<number, number> = { 1: 1, 2: 0.85, 3: 0.7, 4: 0.5, 5: 0.3 };

interface FactorDef {
  id: FactorId;
  weight: number;
  evidence: DocKey[];
  /** Returns null when the inputs needed are missing. Label and why it matters come from the messages. */
  assess: (c: CreditProfile, asOf: string, L: CreditLang) => { ratio: number; detail: string } | null;
}

const backlog = (c: CreditProfile): number => c.contracts.reduce((s, k) => s + k.remainingSar, 0);
const f1 = (n: number): string => n.toFixed(1);
const f2 = (n: number): string => n.toFixed(2);
const inDate = (validUntil: string | undefined, asOf: string): boolean => !!validUntil && validUntil >= asOf;

export const FACTORS: readonly FactorDef[] = [
  {
    id: 'liquidity',
    weight: 15,
    evidence: ['financials_qawaem', 'bank_statements'],
    assess: (c, _asOf, { m }) => {
      if (!c.financials || !c.bank) return null;
      const current = c.financials.currentLiabilitiesSar > 0 ? c.financials.currentAssetsSar / c.financials.currentLiabilitiesSar : 3;
      const cover = c.monthlyPurchasesSar > 0 ? c.bank.avgBalanceSar / c.monthlyPurchasesSar : 2;
      const ratio =
        0.6 * scale(current, [[0.8, 0], [1, 0.4], [1.5, 0.8], [2, 1]]) + 0.4 * scale(cover, [[0, 0], [0.5, 0.5], [1.5, 1]]);
      return { ratio, detail: fill(m.factorDetail.liquidity, { ratio: f2(current), months: f1(cover) }) };
    },
  },
  {
    id: 'payment_history',
    weight: 15,
    evidence: ['simah_report'],
    assess: (c, _asOf, { m }) => {
      const r = c.simah.report;
      if (!r) return null;
      let simah = scale(r.score, [[550, 0], [650, 0.5], [750, 1]]) - 0.15 * r.delinquencies12m;
      if (r.unsettledDefaultSar > 0) simah = 0;
      simah = Math.max(0, simah);
      const p = c.platform;
      if (!p || p.ordersPaid < 3) return { ratio: simah, detail: fill(m.factorDetail.paymentNoPlatform, { score: r.score }) };
      const platform = scale(p.avgDaysLate, [[0, 1], [7, 0.6], [30, 0]]);
      return {
        ratio: 0.7 * simah + 0.3 * platform,
        detail: fill(m.factorDetail.payment, { score: r.score, orders: p.ordersPaid, late: f1(p.avgDaysLate) }),
      };
    },
  },
  {
    id: 'payer_quality',
    weight: 12,
    evidence: ['contracts_in_hand'],
    assess: (c, _asOf, { m, pct }) => {
      const total = backlog(c);
      if (total <= 0) return null;
      const ratio = c.contracts.reduce((s, k) => s + PAYER_QUALITY[k.payerType] * k.remainingSar, 0) / total;
      const strong = c.contracts
        .filter((k) => PAYER_QUALITY[k.payerType] >= 0.8)
        .reduce((s, k) => s + k.remainingSar, 0);
      return { ratio, detail: fill(m.factorDetail.payerQuality, { pct: pct(strong / total) }) };
    },
  },
  {
    id: 'leverage_profitability',
    weight: 10,
    evidence: ['financials_qawaem'],
    assess: (c, _asOf, { m, pct1 }) => {
      const f = c.financials;
      if (!f || f.revenueSar <= 0) return null;
      const debtToEquity = f.netWorthSar > 0 ? f.totalLiabilitiesSar / f.netWorthSar : 99;
      const margin = f.netProfitSar / f.revenueSar;
      const ratio =
        0.5 * scale(debtToEquity, [[0.5, 1], [1.5, 0.6], [3, 0]]) + 0.5 * scale(margin, [[-0.0001, 0], [0, 0.2], [0.05, 0.7], [0.1, 1]]);
      return { ratio, detail: fill(m.factorDetail.leverage, { times: f2(debtToEquity), margin: pct1(margin) }) };
    },
  },
  {
    id: 'backlog_capacity',
    weight: 10,
    evidence: ['contracts_in_hand', 'vat_returns'],
    assess: (c, _asOf, { m }) => {
      const revenue = c.vat?.annualRevenueSar ?? c.financials?.revenueSar ?? 0;
      if (revenue <= 0) return null;
      const cover = backlog(c) / revenue;
      return {
        ratio: scale(cover, [[0, 0.1], [0.5, 1], [1.5, 1], [2.5, 0.5], [4, 0.1]]),
        detail: fill(m.factorDetail.backlog, { times: f2(cover) }),
      };
    },
  },
  {
    id: 'wip_health',
    weight: 10,
    evidence: ['contracts_in_hand'],
    assess: (c, _asOf, { m, pct }) => {
      const value = c.contracts.reduce((s, k) => s + k.valueSar, 0);
      const revenue = c.vat?.annualRevenueSar ?? c.financials?.revenueSar ?? 0;
      if (value <= 0 || revenue <= 0) return null;
      const gap = c.contracts.reduce((s, k) => s + Math.abs(k.percentComplete - k.billedPct) * k.valueSar, 0) / value;
      const overdue = c.contracts.reduce((s, k) => s + k.overdueReceivableSar, 0) / revenue;
      const ratio = 0.5 * scale(gap, [[0, 1], [10, 0.6], [25, 0]]) + 0.5 * scale(overdue, [[0, 1], [0.1, 0.5], [0.25, 0]]);
      return { ratio, detail: fill(m.factorDetail.wip, { points: f1(gap), pct: pct(overdue) }) };
    },
  },
  {
    id: 'bank_behaviour',
    weight: 10,
    evidence: ['bank_statements'],
    assess: (c, _asOf, { m }) => {
      const b = c.bank;
      if (!b) return null;
      const ratio =
        (scale(b.returnedCheques, [[0, 1], [1, 0.5], [3, 0]]) +
          scale(b.negativeBalanceDays, [[0, 1], [10, 0.5], [30, 0]]) +
          scale(b.inflowVolatility, [[0.2, 1], [0.6, 0.4], [1, 0]])) /
        3;
      return {
        ratio,
        detail: fill(m.factorDetail.bank, { cheques: b.returnedCheques, days: b.negativeBalanceDays, volatility: f2(b.inflowVolatility) }),
      };
    },
  },
  {
    id: 'concentration',
    weight: 8,
    evidence: ['contracts_in_hand'],
    assess: (c, _asOf, { m, pct }) => {
      const total = backlog(c);
      if (total <= 0) return null;
      const top = topPayerShare(c);
      return { ratio: scale(top, [[0.3, 1], [0.5, 0.7], [0.8, 0.2], [1, 0]]), detail: fill(m.factorDetail.concentration, { pct: pct(top) }) };
    },
  },
  {
    id: 'track_record',
    weight: 5,
    evidence: ['cr', 'contractor_classification'],
    assess: (c, _asOf, { m }) => {
      const grade = c.applicant.classificationGrade;
      const ratio =
        0.6 * scale(c.applicant.yearsTrading, [[0, 0], [2, 0.2], [5, 0.6], [10, 1]]) +
        0.4 * (grade === null ? 0.1 : (CLASSIFICATION_QUALITY[grade] ?? 0.1));
      return {
        ratio,
        detail:
          grade === null
            ? fill(m.factorDetail.trackRecordUnclassified, { years: c.applicant.yearsTrading })
            : fill(m.factorDetail.trackRecordGraded, { years: c.applicant.yearsTrading, grade }),
      };
    },
  },
  {
    id: 'compliance_disputes',
    weight: 5,
    evidence: ['zakat_certificate', 'gosi_certificate', 'vat_returns'],
    assess: (c, asOf, { m }) => {
      const zakat = inDate(c.zakat?.validUntil, asOf);
      const gosi = inDate(c.gosi?.validUntil, asOf);
      const late = c.vat?.lateFilings ?? 4;
      const ratio =
        (Number(zakat) + Number(gosi) + scale(late, [[0, 1], [2, 0.3], [4, 0]]) + scale(c.openLegalCases, [[0, 1], [1, 0.5], [3, 0]])) / 4;
      return {
        ratio,
        detail: fill(m.factorDetail.compliance, {
          zakat: zakat ? m.factorDetail.valid : m.factorDetail.missingOrExpired,
          gosi: gosi ? m.factorDetail.valid : m.factorDetail.missingOrExpired,
          late,
          cases: c.openLegalCases,
        }),
      };
    },
  },
];

export function topPayerShare(c: CreditProfile): number {
  const total = backlog(c);
  if (total <= 0) return 0;
  const byPayer = new Map<string, number>();
  for (const k of c.contracts) byPayer.set(k.payer, (byPayer.get(k.payer) ?? 0) + k.remainingSar);
  return Math.max(...byPayer.values()) / total;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function scoreFactors(c: CreditProfile, asOf: string, L: CreditLang = EN): FactorResult[] {
  return FACTORS.map(({ assess, ...def }) => {
    const r = assess(c, asOf, L);
    const ratio = r ? Math.min(1, Math.max(0, r.ratio)) : 0;
    return {
      ...def,
      label: L.m.factors[def.id].label,
      whyItMatters: L.m.factors[def.id].why,
      ratio,
      points: round1(def.weight * ratio),
      pointsLost: round1(def.weight - round1(def.weight * ratio)),
      direction: ratio >= 0.5 ? ('raised' as const) : ('lowered' as const),
      assessed: r !== null,
      detail: r?.detail ?? L.m.factorDetail.notAssessed,
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
