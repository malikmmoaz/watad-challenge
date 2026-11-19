/**
 * Twelve months of cash flow, derived from the bank-statement figures the
 * (simulated) document reader extracted: annual inflows, average balance,
 * inflow volatility, returned cheques and overdrawn days. Pure and seeded by
 * the case id, so a case always shows the same months, and the annual
 * figures are reproduced exactly (inflows sum to the annual total; the
 * average closing balance is the average balance).
 *
 * Annotations are simulated-AI observations found by plain rules over the
 * months: a large one-off inflow, months with returned cheques, a seasonal
 * dip, and overdrawn months. Each names the bank-statement field behind it.
 */
import type { CreditProfile } from "./types";

export interface CashflowMonth {
  /** yyyy-mm */
  month: string;
  inflowSar: number;
  outflowSar: number;
  closingSar: number;
  returnedCheques: number;
}

export type AnnotationKind = "one_off_inflow" | "returned_cheque" | "seasonal_dip" | "overdrawn";

export interface CashflowAnnotation {
  kind: AnnotationKind;
  /** Index into the months. */
  index: number;
  month: string;
  /** Inflow multiple of the median month (one-off, dip); cheque count; or closing balance. */
  value: number;
  /** The extracted bank-statement field this rests on. */
  evidenceField: "bank_inflows_12m" | "bank_returned_items" | "bank_negative_days" | "bank_avg_balance";
}

/** Small deterministic PRNG (mulberry32) seeded from a string. */
function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Construction activity in Saudi Arabia slows in the summer heat and around Ramadan; a gentle seasonal shape by calendar month. */
const SEASON: Record<number, number> = { 1: 1.02, 2: 1.04, 3: 0.97, 4: 1.0, 5: 1.03, 6: 0.86, 7: 0.82, 8: 0.88, 9: 1.04, 10: 1.08, 11: 1.1, 12: 1.16 };

const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

/** The twelve calendar months before `asOf` (yyyy-mm-dd), oldest first. */
export function lastTwelveMonths(asOf: string): string[] {
  let y = Number(asOf.slice(0, 4));
  let m = Number(asOf.slice(5, 7));
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    out.unshift(monthKey(y, m));
  }
  return out;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[5]! + s[6]!) / 2;
};

export function monthlyCashflow(p: CreditProfile, asOf: string, seed = p.id): CashflowMonth[] {
  const bank = p.bank;
  const months = lastTwelveMonths(asOf);
  if (!bank) return [];
  const rand = rng(seed);
  const noise = () => (rand() + rand() + rand() - 1.5) / 1.5; // roughly -1..1, centred
  const vol = Math.min(1, Math.max(0, bank.inflowVolatility));

  // Inflows: seasonal shape x noise scaled by volatility; one lumpy month when inflows are erratic.
  const weights = months.map((mk) => Math.max(0.25, SEASON[Number(mk.slice(5))]! * (1 + vol * 0.6 * noise())));
  if (vol >= 0.4) {
    const lump = 2 + Math.floor(rand() * 8); // somewhere in months 3 to 10
    weights[lump] = weights[lump]! * (1.7 + vol);
  }
  const total = weights.reduce((s, w) => s + w, 0);
  const inflows = weights.map((w) => Math.round((w / total) * bank.annualInflowsSar));
  inflows[11]! += bank.annualInflowsSar - inflows.reduce((s, x) => s + x, 0); // exact annual total

  // Outflows follow inflows with a one-month lag (suppliers and payroll paid as certificates clear), plus noise.
  const outflows = inflows.map((x, i) => Math.round((0.55 * x + 0.45 * (inflows[i - 1] ?? x)) * (1 + 0.08 * noise())));
  // Over the year, outflows match inflows: the balance ends near where it started.
  const drift = inflows.reduce((s, x) => s + x, 0) - outflows.reduce((s, x) => s + x, 0);
  outflows[11]! += drift;

  // Closing balances, then shifted so their average is the extracted average balance.
  let run = 0;
  const raw = inflows.map((x, i) => (run += x - outflows[i]!));
  const shift = bank.avgBalanceSar - raw.reduce((s, x) => s + x, 0) / 12;
  const closing = raw.map((x) => Math.round(x + shift));

  // Returned cheques land in the tightest months.
  const byTightness = closing.map((b, i) => ({ b, i })).sort((a, b) => a.b - b.b);
  const cheques = new Array<number>(12).fill(0);
  for (let k = 0; k < bank.returnedCheques; k++) cheques[byTightness[k % 3]!.i]! += 1;

  return months.map((month, i) => ({ month, inflowSar: inflows[i]!, outflowSar: outflows[i]!, closingSar: closing[i]!, returnedCheques: cheques[i]! }));
}

/** Simulated-AI observations over the months, in month order. */
export function annotate(months: CashflowMonth[], overdrawnDays = 0): CashflowAnnotation[] {
  if (months.length !== 12) return [];
  const inflows = months.map((m) => m.inflowSar);
  const mid = median(inflows);
  const out: CashflowAnnotation[] = [];
  const maxI = inflows.indexOf(Math.max(...inflows));
  if (inflows[maxI]! >= 1.5 * mid) out.push({ kind: "one_off_inflow", index: maxI, month: months[maxI]!.month, value: inflows[maxI]! / mid, evidenceField: "bank_inflows_12m" });
  const minI = inflows.indexOf(Math.min(...inflows));
  if (inflows[minI]! <= 0.8 * mid) out.push({ kind: "seasonal_dip", index: minI, month: months[minI]!.month, value: inflows[minI]! / mid, evidenceField: "bank_inflows_12m" });
  months.forEach((m, i) => {
    if (m.returnedCheques > 0) out.push({ kind: "returned_cheque", index: i, month: m.month, value: m.returnedCheques, evidenceField: "bank_returned_items" });
  });
  if (overdrawnDays > 15) {
    const lowI = months.reduce((lo, m, i) => (m.closingSar < months[lo]!.closingSar ? i : lo), 0);
    out.push({ kind: "overdrawn", index: lowI, month: months[lowI]!.month, value: months[lowI]!.closingSar, evidenceField: "bank_negative_days" });
  }
  return out.sort((a, b) => a.index - b.index || a.kind.localeCompare(b.kind));
}
