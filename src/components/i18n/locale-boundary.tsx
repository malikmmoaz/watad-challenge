"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const noop = () => () => {};

/**
 * Wrap content that streams in after the first paint (inside <Suspense> on
 * request-time routes). Its HTML is rendered on the server in English and is
 * inserted as soon as it arrives, before React hydrates it. For an Arabic
 * reader that would flash English, so this marks the content as not yet
 * hydrated (`data-i18n-hydrated="false"`) and CSS hides it under
 * html[lang="ar"] until React has hydrated it, which is the same render that
 * switches its text to Arabic (ADR 0005). English pages are unaffected.
 */
export function LocaleBoundary({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  // display: contents adds no box, so layout is unchanged; visibility still inherits.
  return (
    <div className="contents" data-i18n-hydrated={hydrated ? "true" : "false"}>
      {children}
    </div>
  );
}
