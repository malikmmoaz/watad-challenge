# Product analytics (PostHog)

PostHog EU Cloud, project "Default project (Watad Challenge)". Initialised in `src/instrumentation-client.ts`; all calls go through `src/lib/analytics`.

- **No key, no tracking.** Without `NEXT_PUBLIC_POSTHOG_KEY` (local dev, CI, tests) every call is a no-op.
- **Anonymous.** The demo has no login; no person profiles are created and inputs are masked in session replay.
- **No business data.** Properties are ids, counts and enum values. No company names, document contents, free text or amounts.
- **Automatic:** pageviews on route change, page leave, autocapture (element text and attributes masked), uncaught exceptions.
- **Client IP:** "Discard client IP data" is to be turned on in the PostHog project settings (Malik; agents have read-only project access), so no IP is stored.

## Capturing an event

```ts
import { termsKey, track } from "@/lib/analytics";
track("offer_submitted", { rfq_id, offer_id, local_content, terms: termsKey(offer.paymentTerms) });
```

Events and their properties are typed in `src/lib/analytics/events.ts`. Add a new event there first; `track` rejects names and properties that are not in the catalog.

## Funnels the events support

| Funnel | Steps |
|---|---|
| Procurement | `rfq_started` → `rfq_sent` → `offers_compared` → `offer_awarded` → `po_placed` |
| Supplier response | `rfq_sent` → `offer_submitted` → `offer_awarded` |
| Credit | `credit_application_started` → `credit_application_submitted` → `credit_case_opened` → `credit_decision_made` |
| Credit at PO | `po_placed` split by `payment_method` and `within_credit_cap` |
| Reviewer journey | `role_selected` by `role` and `source` |

## Status

Wired so far: `role_selected` (landing cards and header switcher) and `demo_reset`. The other events are captured by the feature PRs that own those screens. Arrival in PostHog is verified on the first Vercel deploy: the build machine cannot run a headless browser.
