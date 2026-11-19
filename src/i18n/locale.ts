"use client";

/**
 * The reader's locale, shared by every client component. Server render and
 * hydration use English (pages stay static); the stored choice applies right
 * after hydration, before the page is shown (see LOCALE_BOOT_SCRIPT).
 */
import { useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, dirOf, isLocale, LOCALE_STORAGE_KEY, type Dictionary, type Locale, type Messages, type SameShape } from "./core";
import { formattersFor, type Formatters } from "./format";

const listeners = new Set<() => void>();

/** The locale the reader chose, from storage (English if none). */
export function storedLocale(): Locale {
  return read();
}

function read(): Locale {
  try {
    const v = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(v) ? v : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCALE_STORAGE_KEY) {
      apply(read());
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function apply(locale: Locale) {
  const html = document.documentElement;
  html.lang = locale;
  html.dir = dirOf(locale);
}

export function setLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  apply(locale);
  listeners.forEach((l) => l());
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_LOCALE);
}

/** One area's strings in the current locale: `const m = useMessages(common); m.appBar.about`. */
export function useMessages<T extends Messages>(dict: Dictionary<T>): SameShape<T> {
  return useLocale() === "ar" ? dict.ar : (dict.en as SameShape<T>);
}

/** Money, numbers, dates and percentages in the current locale (Latin digits in Arabic). */
export function useFormat(): Formatters {
  return formattersFor(useLocale());
}
