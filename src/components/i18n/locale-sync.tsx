"use client";

import { useLayoutEffect } from "react";
import { dirOf } from "@/i18n/core";
import { storedLocale, useLocale } from "@/i18n/locale";

/** Run `fn` once the document has loaded and the browser is idle: by then every segment has hydrated. */
function afterHydration(fn: () => void) {
  const idle = () => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(fn, { timeout: 500 });
    else setTimeout(fn, 50);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}

/**
 * Keeps <html lang dir> in step with the locale and reveals the page once it
 * is rendered in the stored locale. The first (hydration) render is always
 * English. When the reader chose Arabic, the boot script already set
 * <html lang="ar" dir="rtl"> and hid the body. Next.js hydrates route segments
 * separately (root layout, role layout, page), so wait until the document has
 * loaded and the browser is idle before revealing: otherwise a segment that
 * hydrates later would show its English server HTML for a moment (ADR 0005).
 */
export function LocaleSync() {
  const locale = useLocale();
  useLayoutEffect(() => {
    if (locale !== storedLocale()) return;
    const html = document.documentElement;
    html.lang = locale;
    html.dir = dirOf(locale);
    if (!html.classList.contains("i18n-pending")) return;
    afterHydration(() => html.classList.remove("i18n-pending"));
  }, [locale]);
  return null;
}
