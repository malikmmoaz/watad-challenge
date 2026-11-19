/**
 * What-if: how the outcome would change if a few facts about the applicant
 * were different. Pure: it edits a copy of the profile and re-runs the same
 * engine, so the simulation can never disagree with a real assessment.
 * Nothing is saved; the case keeps its own assessment.
 */
import { assessCase } from "./engine";
import { PROFIT_RATE_PER_30_DAYS } from "./murabaha";
import type { Band, CreditProfile, Decision } from "./types";

export interface WhatIfLevers {
  /** VAT returns, bank statements and financials all show the same revenue. */
  vatReconciled: boolean;
  /** SIMAH commercial score, 500 to 850. */
  simahScore: number;
  /** Overdue receivables across contracts, as a share of annual revenue (0 to 0.3). */
  overdueShare: number;
  /** Returned cheques in the statement period (0 to 6). */
  returnedCheques: number;
  /** Years trading (0 to 20). */
  yearsTrading: number;
}

export const LEVER_RANGE = {
  simahScore: { min: 500, max: 850, step: 10 },
  overdueShare: { min: 0, max: 0.3, step: 0.01 },
  returnedCheques: { min: 0, max: 6, step: 1 },
  yearsTrading: { min: 0, max: 20, step: 1 },
} as const;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** The levers as the applicant's file has them today. */
export function leversOf(p: CreditProfile): WhatIfLevers {
  const revenue = p.vat?.annualRevenueSar ?? p.financials?.revenueSar ?? 0;
  const overdue = p.contracts.reduce((s, k) => s + k.overdueReceivableSar, 0);
  const vat = p.vat?.annualRevenueSar;
  const bankEx = p.bank ? p.bank.annualInflowsSar / 1.15 : undefined;
  const fin = p.financials?.revenueSar;
  const close = (a?: number) => vat !== undefined && a !== undefined && Math.abs(a - vat) / vat <= 0.15;
  return {
    vatReconciled: close(bankEx) && close(fin),
    simahScore: p.simah.report?.score ?? 650,
    overdueShare: revenue > 0 ? clamp(Math.round((overdue / revenue) * 100) / 100, 0, LEVER_RANGE.overdueShare.max) : 0,
    returnedCheques: p.bank?.returnedCheques ?? 0,
    yearsTrading: p.applicant.yearsTrading,
  };
}

/** A copy of the profile with the levers applied. */
export function applyLevers(p: CreditProfile, w: WhatIfLevers): CreditProfile {
  const revenue = p.vat?.annualRevenueSar ?? p.financials?.revenueSar ?? 0;
  const totalOverdue = p.contracts.reduce((s, k) => s + k.overdueReceivableSar, 0);
  const targetOverdue = revenue * clamp(w.overdueShare, 0, LEVER_RANGE.overdueShare.max);
  const contracts = p.contracts.map((k, i) => ({
    ...k,
    // Spread the overdue amount across contracts in the same proportions (all on the first if none today).
    overdueReceivableSar: Math.round(totalOverdue > 0 ? (k.overdueReceivableSar / totalOverdue) * targetOverdue : i === 0 ? targetOverdue : 0),
  }));
  const vat = p.vat?.annualRevenueSar;
  return {
    ...p,
    applicant: { ...p.applicant, yearsTrading: Math.round(clamp(w.yearsTrading, 0, LEVER_RANGE.yearsTrading.max)) },
    bank: p.bank
      ? {
          ...p.bank,
          returnedCheques: Math.round(clamp(w.returnedCheques, 0, LEVER_RANGE.returnedCheques.max)),
          ...(w.vatReconciled && vat ? { annualInflowsSar: Math.round(vat * 1.15), monthsProvided: Math.max(6, p.bank.monthsProvided) } : {}),
        }
      : p.bank,
    financials: p.financials && w.vatReconciled && vat ? { ...p.financials, revenueSar: vat } : p.financials,
    simah: {
      ...p.simah,
      // A simulated SIMAH score implies a report on file.
      report: { score: clamp(w.simahScore, LEVER_RANGE.simahScore.min, LEVER_RANGE.simahScore.max), unsettledDefaultSar: p.simah.report?.unsettledDefaultSar ?? 0, delinquencies12m: p.simah.report?.delinquencies12m ?? 0 },
      consent: true,
    },
    contracts,
  };
}

export interface WhatIfOutcome {
  score: number;
  band: Band;
  decision: Decision;
  /** Approved cap in whole SAR (never above the request). */
  capSar: number;
  /** Murabaha profit rate for the requested tenor; null when the band gives no facility. */
  profitRate: number | null;
  apr: number | null;
}

export function outcomeOf(p: CreditProfile, asOf: string): WhatIfOutcome {
  const a = assessCase(p, asOf);
  const rate30 = a.band === "D" ? null : PROFIT_RATE_PER_30_DAYS[a.band];
  const profitRate = rate30 === null ? null : (rate30 * p.request.tenorDays) / 30;
  return {
    score: a.score,
    band: a.band,
    decision: a.proposedDecision,
    capSar: a.proposedDecision === "decline" || a.proposedDecision === "refer" ? 0 : a.limit.approvedCapSar,
    profitRate,
    apr: profitRate === null ? null : (profitRate * 365) / p.request.tenorDays,
  };
}

/** The outcome today and with the levers moved. */
export function simulate(p: CreditProfile, asOf: string, w: WhatIfLevers): { current: WhatIfOutcome; simulated: WhatIfOutcome } {
  return { current: outcomeOf(p, asOf), simulated: outcomeOf(applyLevers(p, w), asOf) };
}
