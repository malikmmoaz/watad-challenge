"use client";

import { useEffect, useLayoutEffect } from "react";
import { dirOf } from "@/i18n/core";
import { storedLocale, useLocale } from "@/i18n/locale";
import { meta, pageKeyOf, SITE_AR, SITE_EN } from "@/i18n/meta";

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

  // Tab title in the reader's locale. Server metadata is English (it is what link
  // previews read); Next rewrites <title> on navigation, so re-apply when it does.
  useEffect(() => {
    // Reads the path at call time, not via usePathname: that hook in the root layout
    // would make every dynamic route opt out of prerendering (Cache Components).
    const apply = () => {
      const key = pageKeyOf(window.location.pathname);
      if (!key) return;
      const want = `${meta[locale][key].title} · ${locale === "ar" ? SITE_AR : SITE_EN}`;
      if (document.title !== want) document.title = want;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);
  return null;
}
