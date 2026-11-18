# Applying the design language to a screen

For whoever restyles a screen onto the language in DESIGN.md (landing page and #60). About 30 to 45 minutes per screen. Change classes and composition only: no logic, no test ids.

## Before you start
- Base your branch on `main` once #60 has merged (or on `feat/7-landing-v2` before that).
- Take a 1440 and a 390 screenshot of the screen as it is now, for the PR.

## Structure
1. **One `PageHeader` per page**: title (one `h1`), status as a `Badge`, serial or meta line, and at most one primary action on the right. `eyebrow` only where a short context word helps (e.g. the role); never a tracked-caps kicker above section headings.
2. **Group with `Panel`**; use `<Panel flush>` around a `Table` or a list that brings its own rows.
3. **No bordered card inside a card.** Inside a panel, group with a hairline (`border-t border-line`), a heading, or a borderless well (`rounded-xl bg-paper p-4`).
4. **Side-by-side panels:** `grid gap-4 lg:grid-cols-2` (or `lg:grid-cols-3` with one `lg:col-span-2`). They stack below 1024 px.

## Components, not hand-rolled classes
5. **Buttons:** `Button`, or `buttonClass(variant, size)` on a `Link`. One `primary` per view, `secondary` for the rest, `quiet` for cancel, `danger` for decline. Size `lg` only on landing calls to action.
6. **Tables:** `Table` / `THead` / `Th` / `Tr` / `Td` / `CellNote`. Money right-aligned through `formatSar()`; row state with `Tr state`.
7. **Status words:** `RFQ_STATUS`, `PO_STATUS`, `CREDIT_CASE_STATUS`, `GATE_RESULT` from `src/lib/status.ts` into a `Badge`. Dates through `formatDate` / `formatDateTime` from `src/lib/format.ts`, never ISO strings on screen.
8. **Simulated AI:** `AiLabel`, and AI-written blocks in a dashed well: `rounded-xl border border-dashed border-ai-line bg-ai-soft p-4`. Sample data: `SampleDataLabel`.
9. **Evidence and decisions:** `EvidenceSeal` beside any figure a document backs; `DecisionStamp` for a person's decision (accepts `approve` / `request_info` / `decline`). Never stamp or seal an AI proposal.
10. **Credit:** `ScoreScale`, `FactorBar`, `CreditCapMeter`. **Time:** `StatusTimeline`, `LeadTimeBar`.

## Type, colour, motion
11. Role tokens only. This must print nothing:
    `grep -rnE '(text|bg|border|divide|ring)-(neutral|gray|slate|zinc|amber|sky|red|green|blue|yellow)-[0-9]' src/<your files>`
12. Section headings inside a screen: `text-lg font-semibold` (panel titles come from `Panel`). Display sizes (`text-5xl` and up) and the italic serif are for the landing page only.
13. Icons sit inline with their label (`flex items-center gap-2`), not in a tile above a heading.
14. Motion on working screens: hover and press states only (the components already have them). No `animate-*` on data.

## Done means
15. Every test id unchanged; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e` pass.
16. 1440 and 390 screenshots: no sideways scroll, no console errors.
17. PR with before and after screenshots; ask Layla for a design review in the channel.
