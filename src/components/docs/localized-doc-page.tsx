"use client";

import type { DocPage as DocPageContent } from "@/content/types";
import { docs } from "@/i18n/docs";
import { useLocale, useMessages } from "@/i18n/locale";
import { DocPage } from "./doc-page";

/**
 * An explanation page in the reader's language (ADR 0005). The copy stays in
 * `src/content/*.ts` (English) and `*.ar.ts` (Arabic) with the same section ids,
 * so anchors and tests work in both.
 */
export function LocalizedDocPage({ en, ar }: { en: DocPageContent; ar: DocPageContent }) {
  const m = useMessages(docs);
  return <DocPage page={useLocale() === "ar" ? ar : en} labels={{ onThisPage: m.onThisPage, draft: m.draft }} />;
}
