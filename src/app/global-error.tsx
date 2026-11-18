"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/analytics";
import { fontVariables } from "@/styles/fonts";
import "./globals.css";

/**
 * Last-resort boundary for errors in the root layout. Renders its own document,
 * so it imports the global styles itself and avoids anything that could fail again.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    captureError(error, "global");
  }, [error]);

  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper">
        <title>Something went wrong · Watad challenge demo</title>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16" data-testid="global-error">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Something went wrong</h1>
          <p className="max-w-prose text-ink-muted">The error has been reported. Try again, or reload the page.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => retry()} className="rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action">
              Try again
            </button>
            {/* A full reload on purpose: the root layout failed, so client navigation cannot be trusted. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="rounded-md border border-line-control px-4 py-2 text-sm font-medium text-ink">
              Back to the start
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
