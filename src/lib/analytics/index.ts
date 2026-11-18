/**
 * Thin, typed wrapper around posthog-js. Safe to call from any client code:
 * it is a no-op on the server, in tests, and when no project key is set.
 */
import posthog from "posthog-js";
import type { Role } from "@/domain/types";
import type { AnalyticsEvent, AnalyticsEvents } from "./events";

export type { AnalyticsEvent, AnalyticsEvents, TermsKey } from "./events";
export { termsKey } from "./events";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let started = false;

export const analyticsEnabled = (): boolean => started;

/** Called once from `src/instrumentation-client.ts`. */
export function initAnalytics(): void {
  if (started || typeof window === "undefined" || !KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    ui_host: "https://eu.posthog.com",
    defaults: "2025-11-30",
    // The demo has no login: keep visitors anonymous and store no person profiles.
    person_profiles: "identified_only",
    // Sample data only, but keep business text out of analytics: autocapture sends
    // no element text or attributes, and replay masks every input.
    mask_all_text: true,
    mask_all_element_attributes: true,
    session_recording: { maskAllInputs: true },
    capture_exceptions: true,
  });
  posthog.register({ app: "watad-challenge-demo", sample_data: true });
  started = true;
}

declare global {
  interface Window {
    /**
     * Test-only sink. Playwright sets it before the app loads (e2e/analytics.spec.ts) to record
     * every tracked event, with or without a PostHog key. Never set in production.
     */
    __WATAD_ANALYTICS_SINK__?: { push: (entry: { event: string; properties: unknown }) => unknown };
  }
}

/** Capture a catalogued event with its typed properties. */
export function track<E extends AnalyticsEvent>(event: E, properties: AnalyticsEvents[E]): void {
  if (typeof window !== "undefined") window.__WATAD_ANALYTICS_SINK__?.push({ event, properties });
  if (!started) return;
  posthog.capture(event, properties);
}

/** Attach the role the reviewer is exploring to every later event. */
export function setRole(role: Role): void {
  if (!started) return;
  posthog.register({ role });
}

/**
 * Report an error caught by an error boundary. Sent to PostHog error tracking;
 * Better Stack joins here when #4 lands. Only the error itself and where it
 * was caught are sent, never page content.
 */
export function captureError(error: unknown, boundary: "route" | "global", digest?: string): void {
  if (!started) return;
  posthog.captureException(error, { boundary, ...(digest ? { digest } : {}) });
}
