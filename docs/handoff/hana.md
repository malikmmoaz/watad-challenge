# Hana (credit) handoff

Updated 2026-11-19 03:10 UTC. Design and rules: [ADR 0003](../adr/0003-credit-assessment.md). Open: #147 cash-flow chart (approved, merging).

## Shipped (merged)

- #19 scoring engine: `src/domain/credit` (`assessCase`, checks, scorecard, limit, policy, Murabaha quote, 4 sample cases).
- #27 contractor credit application and tracker: `/contractor/credit`, `/contractor/credit/apply`.
- #35 credit manager workspace: `/credit` queue, `/credit/cases/[id]` case file, `runChecks` / `decide`, factor impact.
- #42 draws carry over when a new cap is approved. #45 draw ledger, repayment, utilisation. #53 loading, empty and success states, "Preparing the file" step-through. #63 available credit derived as cap − drawn; `CreditFacility.available` removed.
- #70 ADR 0003. #79 credit screens on the new design language: score count-up through the bands (once, reduced motion respected), decision stamp moment, queue `StatStrip`. #88 credit analytics: all credit events wired plus `credit_checks_run`, `credit_info_provided`, `draw_repaid`. #96 / #97 contractor Credit page opens on its figures; roomier draws table.

- #144 what-if panel: `src/domain/credit/what-if.ts` (pure, tested), `manager/what-if-panel.tsx`; deltas and better/worse tints; `credit_whatif_changed` / `credit_whatif_reset` analytics.
- #123 credit in Arabic and RTL (engine findings re-rendered via `CreditLang`), #135 seed credit text in Arabic.

## Open

- #147 cash-flow chart: `src/domain/credit/cashflow.ts` (seeded by case id, reproduces the extracted annual figures exactly; annotation rules in `annotate`), `manager/cashflow-chart.tsx` (small SVG, LTR axis in both languages), `e2e/credit-cashflow.spec.ts`.

## Where things are

- Pure logic and tests: `src/domain/credit/*.ts`, `src/domain/credit-application.ts`.
- Sample engine profiles and the 4 queue cases: `src/data/credit-profiles.ts`.
- UI: `src/components/credit/` (contractor) and `src/components/credit/manager/` (credit manager, incl. `score-reveal.tsx`). Client hooks: `client-state.ts` (`useHydrated`, `useHash`, `useReducedMotion`), `use-today.ts`.
- Analytics: events typed in `src/lib/analytics/events.ts`; when each credit event fires is in `docs/analytics.md`.
- E2E: `e2e/contractor-credit.spec.ts`, `e2e/credit-manager.spec.ts` (Noor); the credit funnel in `e2e/analytics.spec.ts`.

## Gotchas

- Next 16 cache components: no `new Date()` during prerender in client components (use `useToday`); read route `params` inside `<Suspense>`.
- The store hydrates after first paint; screens show `LoadingRows` until `useHydrated()` is true.
- New sample cases only appear after "Reset demo data" in a browser that already saved state.
- Amounts are whole SAR inside the engine and halalas everywhere else; convert at the boundary (`to-case.ts`, `workflow.ts`).
- E2E on srv1041554: pick your own `E2E_PORT` (I use 3142); 3141 collided with another server once.
- Since 20:45 UTC (Tariq's incident rule): no automated requests to production; test on a local production build or a PR preview.

## Next

- #14 acceptance: Noor runs RFQ → offer → PO paid with credit → repay on production, once the production traffic rule is lifted.
