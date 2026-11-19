/**
 * The number a <input type="number"> holds, read from its text. WebKit does not report
 * `valueAsNumber` reliably for controlled inputs (typed prices were lost in Safari), while the
 * value string is always the number as typed ("15.2"), or "" when empty or not a valid number.
 * Empty means "not set" (NaN), as the forms already treat it.
 */
export function numberFromInput(value: string): number {
  const t = value.trim();
  if (t === "") return Number.NaN;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
}
