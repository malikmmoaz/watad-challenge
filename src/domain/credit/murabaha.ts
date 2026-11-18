import type { Band } from './types';

/** Murabaha profit rate per 30 days of tenor, by credit band. Band D has no facility. */
export const PROFIT_RATE_PER_30_DAYS: Record<Exclude<Band, 'D'>, number> = { A: 0.0125, B: 0.015, C: 0.019 };

export interface MurabahaQuote {
  principalSar: number;
  tenorDays: number;
  /** Fixed Murabaha markup, agreed up front; it does not grow if payment is late. */
  markupSar: number;
  totalRepayableSar: number;
  /** Markup as a share of the principal for this tenor. */
  profitRate: number;
  /** Annualised equivalent of the markup for a single repayment at maturity. */
  apr: number;
}

/** Quote for one purchase order drawn on the cap: the supplier is paid in full, the contractor repays at maturity. */
export function quoteMurabaha(principalSar: number, tenorDays: number, band: Exclude<Band, 'D'>): MurabahaQuote {
  if (principalSar <= 0 || tenorDays <= 0) throw new RangeError('principal and tenor must be positive');
  const profitRate = (PROFIT_RATE_PER_30_DAYS[band] * tenorDays) / 30;
  const markupSar = Math.round(principalSar * profitRate * 100) / 100;
  return {
    principalSar,
    tenorDays,
    markupSar,
    totalRepayableSar: Math.round((principalSar + markupSar) * 100) / 100,
    profitRate,
    apr: (profitRate * 365) / tenorDays,
  };
}

/** Cap still available after outstanding draws; never negative. */
export const availableCap = (approvedCapSar: number, outstandingSar: number): number =>
  Math.max(0, approvedCapSar - outstandingSar);
