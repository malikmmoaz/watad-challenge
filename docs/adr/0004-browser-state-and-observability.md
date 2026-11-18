# ADR 0004: State in the browser, analytics and monitoring

Status: accepted · 2026-11-18 · Owner: Tariq

## Context

ADR 0001 chose no backend: demo state lives in the reviewer's browser. With the app live, we need to say what that means for reviewers, what we measure, how errors surface, and how the app is protected, without adding a server.

## Decisions

**State stays in the browser.**
- Mutable demo state (RFQs, offers, POs, credit cases, facilities) is one JSON document in `localStorage` (`watad-demo-state-v1`), read and written only through `src/store`. All three roles in one browser share it, which is what makes the cross-role demo work from one link.
- Derived values are never stored. Available credit is computed by `availableCredit()` (cap − drawn) since #63, after a stored copy went stale (#55). New fields follow the same rule.
- **Reset demo data** restores the seed. Stored state from an older version is merged over the seed; unknown fields are ignored. If a shape change ever breaks old state, bump the key's version instead of migrating.
- Consequence we accept: state is per browser. Two reviewers never see each other's actions, and a link to something created in one browser shows the not-found page in another, which says so.

**Analytics: PostHog EU, anonymous, typed.**
- `posthog-js` starts in `src/instrumentation-client.ts`, only when `NEXT_PUBLIC_POSTHOG_KEY` is set (Production in Vercel). Local, CI and previews send nothing.
- Every custom event is declared with typed properties in `src/lib/analytics/events.ts` and sent with `track()`. Properties are ids, counts and enums only.
- Privacy: no person profiles, autocapture without element text or attributes, inputs masked in replay, client IP discarded in project settings. posthog-js drops headless and automated browsers, so CI and Playwright don't pollute the data.
- Funnels: procurement (RFQ → offer → PO) and credit (application → decision), on a shared dashboard (#5).

**Errors and monitoring.**
- `src/app/error.tsx` (route errors) and `src/app/global-error.tsx` (root layout errors) show a designed page with *Try again* and, for route errors, *Reset demo data and try again*, since stale browser state is the most likely cause. Both report through `captureError()` to PostHog error tracking; uncaught exceptions are captured too (`capture_exceptions`).
- `src/app/not-found.tsx` gives unknown URLs a page with a way back to every role.
- Better Stack (#4): an uptime monitor checks the live link every 3 minutes and feeds the public status page https://watad-challenge-demo.betteruptime.com; error boundaries also report to Better Stack error tracking through the Sentry browser SDK, loaded lazily and only when `NEXT_PUBLIC_BETTER_STACK_ERRORS_DSN` is set (no PII, no replay, no tracing). No log source: the app is fully static, so there are no server logs.

**Security headers.**
- Set for every route in `next.config.ts` from `src/config/security-headers.ts`: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, HSTS; `X-Powered-By` removed.
- The CSP has no nonces. Pages are prerendered static, and nonces would force per-request rendering. Next's inline bootstrap scripts therefore need `script-src 'unsafe-inline'`. Everything else is limited to our origin and the PostHog EU hosts (plus `vercel.live` on previews). With no user accounts, no server data and no third-party content, the remaining XSS surface is small; nonces become worth it if the app gains a backend.
- An e2e spec checks the headers and the not-found page on every PR.

## Alternatives considered

- Server-side state (KV or Postgres) so reviewers share data: rejected in ADR 0001; still not worth secrets and reset logic for a demo.
- Sentry instead of Better Stack for errors: the team already has Better Stack for uptime and logs, and it accepts the Sentry SDK.
- Nonce-based CSP via middleware: rejected for now, as above.
