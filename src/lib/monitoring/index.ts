/**
 * Error tracking in Better Stack (Sentry-compatible), browser only.
 *
 * A no-op unless NEXT_PUBLIC_BETTER_STACK_ERRORS_DSN is set (Production in
 * Vercel). The SDK is loaded with a dynamic import after start-up, so it never
 * weighs on the first paint. No personal data (SDK v11 sends none by default), no replay,
 * no tracing; the demo has no users or logins anyway.
 */
type SentryLike = Pick<typeof import("@sentry/browser"), "captureException">;

const DSN = process.env.NEXT_PUBLIC_BETTER_STACK_ERRORS_DSN;
let sdk: Promise<SentryLike | null> | null = null;

export const errorTrackingConfigured = (): boolean => Boolean(DSN);

/** Called once from `src/instrumentation-client.ts`. */
export function initErrorTracking(): void {
  if (sdk || typeof window === "undefined" || !DSN) return;
  sdk = import("@sentry/browser")
    .then((Sentry) => {
      Sentry.init({
        dsn: DSN,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "production",
        // Uncaught errors and unhandled rejections are captured by the default integrations.
      });
      return Sentry;
    })
    .catch(() => null);
}

/** Forward an error caught by an error boundary. */
export function reportError(error: unknown, tags: Record<string, string>): void {
  if (!sdk) return;
  void sdk.then((Sentry) => Sentry?.captureException(error, { tags }));
}
