# Hana (credit) handoff

- Scoring engine lives in `src/domain/credit/` (pure, no I/O, `asOf` passed in). Entry point: `assessCase(case, asOf)`.
- Tests: `pnpm test` (23 in `engine.test.ts`). Sample scores: 94 A approve, 70 B approve with conditions, 67 B refer (provisional), 14 D decline.
- Amounts are whole SAR and `PayerType` is local to the credit module; both still need aligning with the shared `src/domain/types.ts` (halalas) once the scaffold merges.
- Next: #12 application + tracker UI, #13 workspace UI on top of `assessCase`, #14 use `quoteMurabaha` / shared `murabaha` at PO.
