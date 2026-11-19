"use client";

import { common } from "@/i18n/common";
import { setLocale, useLocale, useMessages } from "@/i18n/locale";

/** EN / ع switch in the app bar. Shows the language you would switch to. */
export function LocaleToggle({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const m = useMessages(common);
  const next = locale === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      data-testid="locale-toggle"
      title={m.locale.switchTo}
      onClick={() => setLocale(next)}
      className={`flex h-8 min-w-8 items-center justify-center rounded-full border border-line-control bg-surface px-2.5 text-sm font-semibold text-ink shadow-card transition-colors duration-150 hover:bg-paper ${className}`}
    >
      {/* Accessible name starts with the visible label (WCAG 2.5.3): "EN, switch to English". */}
      {/* System font for the glyph: the Arabic web font loads only when the page is in Arabic. */}
      <span lang={next} style={{ fontFamily: "system-ui, sans-serif" }}>
        {next === "ar" ? "ع" : "EN"}
      </span>
      <span className="sr-only">, {m.locale.switchTo}</span>
    </button>
  );
}
