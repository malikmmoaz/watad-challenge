/**
 * i18n core (ADR 0005). No library: typed dictionaries, a locale in
 * localStorage, and a few helpers. Safe to import from server and client.
 */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "watad-locale";

export const dirOf = (locale: Locale): "ltr" | "rtl" => (locale === "ar" ? "rtl" : "ltr");
export const isLocale = (v: unknown): v is Locale => v === "en" || v === "ar";

/** A dictionary: nested objects of strings. `{name}` marks a placeholder. */
export interface Messages {
  readonly [key: string]: string | Messages;
}

/** The same keys as `T`, every leaf a string: what the Arabic side must provide. */
export type SameShape<T> = { readonly [K in keyof T]: T[K] extends string ? string : SameShape<T[K]> };

export interface Dictionary<T extends Messages> {
  en: T;
  ar: SameShape<T>;
}

/**
 * Declare one area's strings. `ar` must have exactly the keys of `en`:
 * a missing or extra key is a type error, so `pnpm typecheck` fails.
 */
export function defineMessages<const T extends Messages>(en: T, ar: SameShape<T>): Dictionary<T> {
  return { en, ar };
}

/** Fill `{name}` placeholders: fill("{n} offers", { n: 3 }) -> "3 offers". */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** Both language versions of one string, picked on the server; serialisable, so it can cross into a client component. */
export interface Localized {
  en: string;
  ar: string;
}

/**
 * Pick one string in both languages, for server components:
 *   <T m={msg(common, (m) => m.appBar.about)} />
 */
export function msg<T extends Messages>(dict: Dictionary<T>, pick: (m: SameShape<T>) => string): Localized {
  return { en: pick(dict.en as SameShape<T>), ar: pick(dict.ar) };
}

/**
 * Inline script for <head>: applies the stored locale to <html> before the
 * first paint. For Arabic it also hides the body until React has re-rendered in
 * Arabic (LocaleSync removes the class), with an 8 s safety net (for JavaScript that fails to load, not for slow loading).
 */
export const LOCALE_BOOT_SCRIPT = `(function(){try{var l=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)});if(l==="ar"){var h=document.documentElement;h.lang="ar";h.dir="rtl";h.classList.add("i18n-pending");setTimeout(function(){h.classList.remove("i18n-pending")},8000)}}catch(e){}})();`;
