/**
 * Extracted document fields are stored as the (simulated) reader wrote them:
 * English labels and English-formatted values. In Arabic, show the label from
 * the messages (by field key) and re-format the values we recognise.
 */
import { fill, type SameShape } from "@/i18n/core";
import type { credit } from "@/i18n/credit";
import type { Formatters } from "@/i18n/format";
import { sar } from "@/domain/money";
import type { ExtractedField } from "@/domain/types";

type M = SameShape<typeof credit.en>;
const amount = (s: string) => Number(s.replace(/,/g, ""));

export function fieldLabel(field: Pick<ExtractedField, "key" | "label">, m: M, ar: boolean): string {
  if (!ar) return field.label;
  return (m.fields as Record<string, string>)[field.key] ?? field.label;
}

export function fieldValue(value: string, m: M, f: Formatters, ar: boolean): string {
  if (!ar) return value;
  let r: RegExpMatchArray | null;
  if ((r = value.match(/^SAR ([\d,]+(?:\.\d+)?)$/))) return f.money(sar(amount(r[1]!)));
  if ((r = value.match(/^SAR ([\d,]+(?:\.\d+)?) remaining · retention (\d+)%$/))) return fill(m.fieldValue.remaining, { amount: f.money(sar(amount(r[1]!))), pct: r[2]! });
  if ((r = value.match(/^(?:Buildings )?Grade (\d)$/i))) return fill(m.fieldValue.grade, { n: r[1]! });
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return f.date(value);
  if (/^active$/i.test(value)) return m.fieldValue.active;
  if (value === "Unqualified") return m.fieldValue.unqualified;
  if (value === "Not audited") return m.fieldValue.notAudited;
  if (value === "Medium Green") return m.fieldValue.mediumGreen;
  return value;
}
