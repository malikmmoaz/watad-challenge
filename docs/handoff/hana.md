# Hana (credit) handoff

Updated 2026-11-18 17:05 UTC. Design and rules: [ADR 0003](../adr/0003-credit-assessment.md).

## Shipped (merged)

- #19 scoring engine: `src/domain/credit` (`assessCase`, checks, scorecard, limit, policy, Murabaha quote, 4 sample cases).
- #27 contractor credit application and tracker: `/contractor/credit`, `/contractor/credit/apply`.
- #35 credit manager workspace: `/credit` queue, `/credit/cases/[id]` case file, `runChecks` / `decide`, factor impact.
- #42 draws carry over when a new cap is approved. #45 draw ledger, repayment, utilisation. #53 loading, empty and success states, "Preparing the file" step-through. #63 available credit derived as cap − drawn; `CreditFacility.available` removed.

## Where things are

- Pure logic and tests: `src/domain/credit/*.ts`, `src/domain/credit-application.ts`.
- Sample engine profiles and the 4 queue cases: `src/data/credit-profiles.ts`.
- UI: `src/components/credit/` (contractor) and `src/components/credit/manager/` (credit manager). Client hooks: `client-state.ts` (`useHydrated`, `useHash`, `useReducedMotion`), `use-today.ts`.
- E2E (Noor): `e2e/contractor-credit.spec.ts`, `e2e/credit-manager.spec.ts`.

## Gotchas

- Next 16 cache components: no `new Date()` during prerender in client components (use `useToday`); read route `params` inside `<Suspense>`.
- The store hydrates after first paint; screens show `LoadingRows` until `useHydrated()` is true.
- New sample cases only appear after "Reset demo data" in a browser that already saved state.
- Amounts are whole SAR inside the engine and halalas everywhere else; convert at the boundary (`to-case.ts`, `workflow.ts`).

## Next

- Restyle the credit screens to Layla's new design language (#60) once it merges: score/band reveal (reduced motion respected), factor bars, AI memo framing, decision stamp.
- #14 acceptance: Noor runs RFQ → offer → PO paid with credit → repay on production.
