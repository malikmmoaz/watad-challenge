"use client";

import { useLayoutEffect } from "react";
import { dirOf } from "@/i18n/core";
import { storedLocale, useLocale } from "@/i18n/locale";

/**
 * Keeps <html lang dir> in step with the locale and reveals the page once
 * React has rendered it in the stored locale. The first (hydration) render is
 * always English; when the reader chose Arabic, the boot script already set
 * <html lang="ar" dir="rtl"> and hid the body, so wait for the Arabic render.
 */
export function LocaleSync() {
  const locale = useLocale();
  useLayoutEffect(() => {
    if (locale !== storedLocale()) return;
    const html = document.documentElement;
    html.lang = locale;
    html.dir = dirOf(locale);
    html.classList.remove("i18n-pending");
  }, [locale]);
  return null;
}
