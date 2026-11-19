/**
 * Error tracking in Better Stack (Sentry-compatible), browser only.
 *
 * A no-op unless NEXT_PUBLIC_BETTER_STACK_ERRORS_DSN is set (Production in
 * Vercel). The SDK (about 137 KB gzipped) is loaded only when an error
 * actually happens: two small listeners catch uncaught errors and unhandled
 * rejections, load the SDK, and report the error. A normal page view pays
 * nothing for error tracking. Once the SDK is up, its own global handlers take
 * over and our listeners step aside, so nothing is reported twice.
 * No personal data (SDK v11 sends none by default), no replay, no tracing.
 */
type SentryLike = Pick<typeof import("@sentry/browser"), "captureException">;

const DSN = process.env.NEXT_PUBLIC_BETTER_STACK_ERRORS_DSN;
let sdk: Promise<SentryLike | null> | null = null;
let listening = false;

export const errorTrackingConfigured = (): boolean => Boolean(DSN);

function onError(event: ErrorEvent) {
  reportError(event.error ?? event.message, { source: "window.error" });
}

function onRejection(event: PromiseRejectionEvent) {
  reportError(event.reason, { source: "unhandledrejection" });
}

/** Load and start the SDK once. Its default integrations capture every later error themselves. */
function loadSdk(): Promise<SentryLike | null> {
  sdk ??= import("@sentry/browser")
    .then((Sentry) => {
      Sentry.init({ dsn: DSN, environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "production" });
      if (listening) {
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
        listening = false;
      }
      return Sentry;
    })
    .catch(() => null);
  return sdk;
}

/** Called once from `src/instrumentation-client.ts`: arms the listeners, loads nothing. */
export function initErrorTracking(): void {
  if (listening || sdk || typeof window === "undefined" || !DSN) return;
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  listening = true;
}

/** Report an error (error boundaries, and the listeners above). Loads the SDK on first use. */
export function reportError(error: unknown, tags: Record<string, string>): void {
  if (typeof window === "undefined" || !DSN) return;
  void loadSdk().then((Sentry) => Sentry?.captureException(error, { tags }));
}
