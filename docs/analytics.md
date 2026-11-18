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
| Credit | `credit_application_started` → `credit_application_submitted` → `credit_case_opened` → `credit_checks_run` → `credit_decision_made` |
| Credit, more information | `credit_decision_made` (`outcome` = `request_info`) → `credit_info_provided` → `credit_checks_run` → `credit_decision_made` |
| Credit review depth | `credit_memo_viewed` and `credit_evidence_opened` per `credit_case_opened`; `credit_decision_made` split by `overrode_ai` |
| Credit at PO | `po_placed` split by `payment_method` and `within_credit_cap` → `draw_repaid` split by `repaid_before_due` |
| Reviewer journey | `role_selected` by `role` and `source` |

## Status

Credit events (wired in #14 follow-up): when each fires, once per action.

| Event | Fires when | Properties |
|---|---|---|
| `credit_application_started` | the apply page opens | none |
| `credit_document_uploaded` | a document type is newly attached (not on replace or re-attach) | `document_type` |
| `credit_application_submitted` | the application is submitted | `case_id`, `document_count` |
| `credit_case_opened` | the credit manager opens a case file (once per visit) | `case_id` |
| `credit_checks_run` | the simulated AI finishes preparing the file | `case_id`, `band`, `proposed_outcome`, `provisional`, `simulated_ai` |
| `credit_memo_viewed` | the drafted memo is on screen (on open, or when the checks produce it) | `case_id`, `simulated_ai` |
| `credit_evidence_opened` | an evidence seal is clicked | `case_id`, `document_type` |
| `credit_decision_made` | the manager records approve, request more information or decline | `case_id`, `outcome`, `overrode_ai` |
| `credit_info_provided` | the contractor answers a request for more information | `case_id`, `file_count`, `has_note` |
| `draw_repaid` | the contractor repays a credit draw | `po_id`, `repaid_before_due`, `tenor_days` |

No amounts, names or free text: `e2e/analytics.spec.ts` asserts each event fires once with exactly these keys, and that none carries a company name, "SAR" or the manager's notes.

Wired so far: `role_selected` (landing cards and header switcher) and `demo_reset`. The other events are captured by the feature PRs that own those screens.

Verified 2026-11-18 15:21 UTC: a local production build with the key sent `$pageview`, `role_selected` (role, source), `$autocapture` and `$web_vitals` to the project, with `app` and `role` registered.

**Bots and E2E:** posthog-js drops events from headless or automated browsers (`navigator.webdriver`, Headless user agent), so Playwright runs in CI and against production do not pollute the data. Do not set `opt_out_useragent_filter`.
