/**
 * Locale-aware formatting. English output is exactly the existing helpers
 * (`formatSar`, `formatDate`, ...), so nothing changes for English readers or
 * tests. Arabic uses Latin digits (the Saudi business norm for figures) and the
 * Gregorian calendar; `ar-SA` alone would give Arabic-Indic digits and Hijri dates.
 */
import { formatSar, toSar } from "@/domain/money";
import type { Halalas, IsoDate } from "@/domain/types";
import { formatDate, formatDateTime, formatPercent } from "@/lib/format";
import type { Locale } from "./core";

const AR = "ar-SA-u-nu-latn-ca-gregory";

const arMoney = new Intl.NumberFormat(AR, { style: "currency", currency: "SAR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const arNumber = new Intl.NumberFormat(AR);
const enNumber = new Intl.NumberFormat("en-US");
const arDate = new Intl.DateTimeFormat(AR, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const arDateTime = new Intl.DateTimeFormat(AR, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Riyadh" });

export interface Formatters {
  money: (h: Halalas) => string;
  number: (n: number) => string;
  date: (iso: IsoDate) => string;
  dateTime: (iso: IsoDate) => string;
  percent: (fraction: number, digits?: number) => string;
}

const en: Formatters = {
  money: formatSar,
  number: (n) => enNumber.format(n),
  date: formatDate,
  dateTime: formatDateTime,
  percent: formatPercent,
};

const ar: Formatters = {
  money: (h) => arMoney.format(toSar(h)),
  number: (n) => arNumber.format(n),
  date: (iso) => arDate.format(new Date(iso)),
  dateTime: (iso) => arDateTime.format(new Date(iso)),
  // Percent sign after the figure with Latin digits reads naturally in Arabic UI copy.
  percent: (fraction, digits = 0) => `${(fraction * 100).toFixed(digits)}٪`,
};

export const formattersFor = (locale: Locale): Formatters => (locale === "ar" ? ar : en);
