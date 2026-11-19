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
