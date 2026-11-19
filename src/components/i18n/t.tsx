"use client";

import type { Localized } from "@/i18n/core";
import { fill } from "@/i18n/core";
import { useLocale } from "@/i18n/locale";

/**
 * One translated string, for server components (pick it with `msg()`):
 *   <T m={msg(common, (m) => m.appBar.about)} />
 * Client components use `useMessages()` directly instead.
 */
export function T({ m, values }: { m: Localized; values?: Record<string, string | number> }) {
  const text = m[useLocale()];
  return <>{values ? fill(text, values) : text}</>;
}
