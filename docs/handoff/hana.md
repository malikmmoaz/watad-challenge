# Hana (credit) handoff

Updated 2026-11-19 06:35 UTC. Design and rules: [ADR 0003](../adr/0003-credit-assessment.md). Open: #175 (outcome block leads with the cap; Layla's optional notes on #171). On call for Layla's 09:30 pass and Noor's final run.

## Shipped (merged)

- #19 scoring engine: `src/domain/credit` (`assessCase`, checks, scorecard, limit, policy, Murabaha quote, 4 sample cases).
- #27 contractor credit application and tracker: `/contractor/credit`, `/contractor/credit/apply`.
- #35 credit manager workspace: `/credit` queue, `/credit/cases/[id]` case file, `runChecks` / `decide`, factor impact.
- #42 draws carry over when a new cap is approved. #45 draw ledger, repayment, utilisation. #53 loading, empty and success states, "Preparing the file" step-through. #63 available credit derived as cap − drawn.
- #70 ADR 0003. #79 credit screens on the design language. #88 credit analytics. #96 / #97 contractor Credit page.
- #123 credit in Arabic and RTL (`CreditLang`), #135 seed credit text in Arabic, #154 Arabic names for the four sample applicants.
- #144 what-if panel (`what-if.ts`, pure, tested): deltas and better/worse tints; `credit_whatif_changed` / `credit_whatif_reset`.
- #147 twelve-month cash-flow chart (`cashflow.ts`, seeded by case id; annotation rules in `annotate`), small SVG, LTR axis in both languages, closing-balance strip.
- Reviewer-walkthrough fixes (19 Nov, early morning):
  - #163: a higher-cap application never lowers the cap (`decide()`, `capChange()`); the form starts at the current cap; "current → approving" on the decision panel. Omar's #164 is the PO side.
  - #171: the contractor's "What this means for you" (`outcomeTerms()`, `termsFor()`), reasons in plain words, "what happens next", and draws as cards on phones.
  - #168: compact case file, with a Top factors strip, factor rows on demand, policy rules and the what-if in the sidebar, and documents collapsed (evidence links open them via `useOpenTargets`).
- #170: credit specs pass on Firefox (sub-pixel tolerance; one axe page per tab).

## Where things are

- Pure logic and tests: `src/domain/credit/*.ts`, `src/domain/credit-application.ts`.
- Sample engine profiles and the queue cases: `src/data/credit-profiles.ts`; engine samples (with `nameAr`): `src/domain/credit/samples.ts`.
- UI: `src/components/credit/` (contractor: `application-form.tsx`, `application-tracker.tsx`, `draw-ledger.tsx`) and `src/components/credit/manager/` (`case-file.tsx`, `decision-panel.tsx`, `what-if-panel.tsx`, `cashflow-chart.tsx`, `score-reveal.tsx`). Display helpers: `data-text.ts`, `log-text.ts`, `field-text.ts`.
- Messages: `src/i18n/credit.ts` (en and ar); `src/i18n/credit-money.test.ts` guards the Arabic «٪» and «ر.س.» rules.
- Analytics: `src/lib/analytics/events.ts`; when each credit event fires is in `docs/analytics.md`.
- E2E: `contractor-credit`, `credit-manager`, `credit-ar`, `credit-higher-cap`, `credit-what-if`, `credit-cashflow`, `credit-compact`; the credit funnel in `analytics.spec.ts`.
- Design references: `docs/design/credit-*` (before/after screenshots for each change).

## Gotchas

- Next 16 cache components: no `new Date()` during prerender in client components (use `useToday`). Earlier routes stay in the DOM (hidden), so tests use `tid()` (visible only) and accessibility scans run one page per tab.
- The store hydrates after first paint; screens show `LoadingRows` until `useHydrated()` is true. New sample cases appear only after "Reset demo data" in a browser with saved state.
- Amounts are whole SAR inside the engine and halalas everywhere else; convert at the boundary (`to-case.ts`, `workflow.ts`).
- The demo contractor (Najd Horizon) already has a SAR 1.5M cap, so any apply test must ask for more than that.
- Number inputs read `e.target.value` (empty means NaN), not `valueAsNumber`, which loses typed values on Safari.
- Arabic money already ends in «ر.س.»: never put a full stop after an amount placeholder; use «٪», not «%».
- E2E on srv1041554: pick your own `E2E_PORT` (I use 3142); no automated requests to production. Use a local production build or the "Cross-browser e2e" workflow with `base_url` empty.

## Next

- On call: Layla's 09:30 pass and Noor's final cross-browser run.
- Not built: lowering a cap as its own reviewed action (ADR 0003, Consequences).
