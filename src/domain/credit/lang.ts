/**
 * The language the engine writes its findings, factor details, policy rules
 * and memo in. Pure: messages plus formatters, passed in by the caller.
 * English is the default and reproduces the engine's original wording exactly.
 */
import { credit } from "@/i18n/credit";
import { fill, type SameShape } from "@/i18n/core";

type CreditMessages = SameShape<typeof credit.en>;

export interface CreditLang {
  m: CreditMessages;
  /** Whole SAR as written in findings: "SAR 300,000". */
  sarShort: (sar: number) => string;
  /** Full amount with halalas: "SAR 300,000.00". */
  sarFull: (sar: number) => string;
  /** 0.34 -> "34%". */
  pct: (fraction: number) => string;
  /** 0.0412 -> "4.1%". */
  pct1: (fraction: number) => string;
}

const enFull = new Intl.NumberFormat("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const AR = "ar-SA-u-nu-latn";
const arShort = new Intl.NumberFormat(AR, { style: "currency", currency: "SAR", maximumFractionDigits: 0 });
const arFull = new Intl.NumberFormat(AR, { style: "currency", currency: "SAR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const EN: CreditLang = {
  m: credit.en as CreditMessages,
  sarShort: (sar) => `SAR ${sar.toLocaleString("en-US")}`,
  sarFull: (sar) => `SAR ${enFull.format(sar)}`,
  pct: (fraction) => `${Math.round(fraction * 100)}%`,
  pct1: (fraction) => `${(fraction * 100).toFixed(1)}%`,
};

export const AR_LANG: CreditLang = {
  m: credit.ar,
  sarShort: (sar) => arShort.format(sar),
  sarFull: (sar) => arFull.format(sar),
  pct: (fraction) => `${Math.round(fraction * 100)}٪`,
  pct1: (fraction) => `${(fraction * 100).toFixed(1)}٪`,
};

export const langFor = (locale: "en" | "ar"): CreditLang => (locale === "ar" ? AR_LANG : EN);

export { fill };
