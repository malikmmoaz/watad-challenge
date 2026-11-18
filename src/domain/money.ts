import type { Halalas } from "./types";

/** Saudi VAT rate. */
export const VAT_RATE = 0.15;

/** Price preference applied to local-content offers when ranking (not when paying). */
export const LOCAL_CONTENT_PREFERENCE = 0.1;

export const halalas = (n: number): Halalas => Math.round(n) as Halalas;

/** Convert a SAR amount (may have decimals) to integer halalas. */
export const sar = (amount: number): Halalas => halalas(amount * 100);

export const toSar = (h: Halalas): number => h / 100;

export const add = (...xs: Halalas[]): Halalas => halalas(xs.reduce((a, b) => a + b, 0));

export const times = (h: Halalas, factor: number): Halalas => halalas(h * factor);

export const vatOn = (h: Halalas): Halalas => times(h, VAT_RATE);

export const inclVat = (h: Halalas): Halalas => add(h, vatOn(h));

const sarFormat = new Intl.NumberFormat("en-SA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "SAR 12,345.00" — fixed locale so server and client render the same string. */
export const formatSar = (h: Halalas): string => `SAR ${sarFormat.format(toSar(h))}`;

/**
 * Murabaha markup for a tenor. `profitRate` is the flat rate for the tenor
 * (0.025 = 2.5%). APR is the simple annualised equivalent, shown beside it.
 */
export function murabaha(principal: Halalas, profitRate: number, tenorDays: number) {
  const markup = times(principal, profitRate);
  return {
    markup,
    totalRepayable: add(principal, markup),
    apr: (profitRate * 365) / tenorDays,
  };
}
