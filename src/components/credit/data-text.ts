/**
 * Sample data shown in the reader's language where we know its translation:
 * city names, the fictional credit manager, and the purposes the sample
 * applications were filed with. Anything else (what a person typed, company
 * and payer names) is shown as written.
 */
import type { SameShape } from "@/i18n/core";
import type { credit } from "@/i18n/credit";

type M = SameShape<typeof credit.en>;

export function cityName(city: string, m: M): string {
  return (m.data.cities as Record<string, string>)[city] ?? city;
}

/** The fictional credit manager's name, as stored on decisions and personas. */
export function personName(name: string, en: M, m: M): string {
  return name === en.data.creditManager ? m.data.creditManager : name;
}

/** A purpose the sample data was filed with, in the reader's language. */
export function purposeText(purpose: string, en: M, m: M): string {
  const key = (Object.keys(en.data.purposes) as (keyof M["data"]["purposes"])[]).find((k) => en.data.purposes[k] === purpose);
  return key ? m.data.purposes[key] : purpose;
}

/**
 * The hand-written seed cases' free text (findings, rationale, reasons,
 * conditions, the memo) in the reader's language, matched on the exact
 * English sentence. Unknown text is shown as written.
 */
export function seedText(text: string, en: M, m: M): string {
  const seed = en.data.seed as Record<string, string>;
  const key = Object.keys(seed).find((k) => seed[k] === text);
  return key ? (m.data.seed as Record<string, string>)[key]! : text;
}

/** A sample applicant's company name: the name stays, its "(sample)" marker is translated. */
export function applicantText(name: string, en: M, m: M): string {
  return name.endsWith(en.data.sampleSuffix) ? name.slice(0, -en.data.sampleSuffix.length) + m.data.sampleSuffix : name;
}

/** A sample project's name and payer in the reader's language, by project id; unknown ids keep their data. */
export function projectText(id: string, fallback: { name: string; payer: string }, m: M): { name: string; payer: string } {
  return (m.data.projects as Record<string, { name: string; payer: string }>)[id] ?? fallback;
}

/** Isolates a Latin run (file name, id, code) inside right-to-left text so it is not reordered. */
export const isolateLtr = (text: string, rtl: boolean): string => (rtl && text ? `\u2066${text}\u2069` : text);
