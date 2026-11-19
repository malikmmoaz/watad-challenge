# ADR 0005: Arabic and right-to-left, without a library

Status: accepted · 2026-11-19 · Owner: Tariq

## Context

Saudi users of a procurement platform read Arabic. The demo must offer full Arabic with right-to-left layout and an EN / ع toggle, while keeping what ADR 0001 and 0004 established: prerendered static pages, no backend, Lighthouse and axe budgets green, analytics unchanged. Six agents convert their own areas in parallel, so the pattern must be small and hard to misuse.

## Decision

**Typed dictionaries, one per area** in `src/i18n/`: `common`, `procurement`, `supplier`, `credit`, `landing`, `docs`. Each is `defineMessages(en, ar)`, where `ar` must have exactly the keys of `en` (`SameShape<T>`): a missing or extra Arabic key is a type error, so `pnpm typecheck` and CI fail. Placeholders are `{name}`, filled with `fill()`. No i18n library: the whole runtime is a hook, a component and two helpers.

**Using strings.**
- Client components: `const m = useMessages(common)`, then `m.appBar.about`. Works for text and attributes (`aria-label`, `placeholder`).
- Server components: `<T m={msg(common, (m) => m.appBar.about)} />`. `msg()` picks the string in both languages on the server (serialisable), and `<T>` is a tiny client leaf that shows the right one. Attributes in a server component need a small client component instead.
- Formatting: `useFormat()` gives `money`, `number`, `date`, `dateTime`, `percent` for the locale. English output is exactly the existing helpers (`formatSar`, `formatDate`), so English pages and tests do not change. Arabic uses `ar-SA-u-nu-latn-ca-gregory`: **Latin digits** (the Saudi business norm for figures), the Gregorian calendar, and the riyal sign.
- Data that already has Arabic (`nameAr` on companies and materials) is shown from the data, not duplicated in dictionaries.

**Locale state.** The choice lives in `localStorage` (`watad-locale`) and in a `useSyncExternalStore` store, like the demo store, so every component re-renders together and other tabs follow. The toggle sits in both app bars (`LocaleToggle`). It shows the target language ("ع" or "EN"), and its accessible name starts with that label (WCAG 2.5.3).

**No flash, pages stay static.** The server renders English. An inline script in `<head>` (`LOCALE_BOOT_SCRIPT`) runs before first paint: for a stored Arabic choice it sets `<html lang="ar" dir="rtl">` and adds `i18n-pending`, which hides the body. React hydrates in English (matching the HTML), the store then yields Arabic, and `LocaleSync` reveals the page once it has rendered in the stored locale. Readers never see English text or a left-to-right layout flip; a 3 s safety net in the script reveals the page if JavaScript fails. English readers, crawlers and Lighthouse get the normal static page with no delay.

**Revealing only when everything is Arabic.** Next.js hydrates route segments separately, and request-time pages stream their content after the shell. So `LocaleSync` reveals the page only after the document has loaded and the browser is idle, and streamed content sits in a `LocaleBoundary` (`data-i18n-hydrated`), hidden under `html[lang="ar"]` until React has hydrated it in Arabic. Measured with JavaScript slowed by 1.5 s per chunk on `/contractor/rfq/rfq_1042`: English UI words visible at the worst moment fell from 248 to 0 (only the sample city name "Riyadh"), page shown at about 1.4 s. The boot script's safety net is 8 s, for JavaScript that fails, not for slow loading.

**Right-to-left layout.** `dir="rtl"` on `<html>` mirrors flex and grid order. Use logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`) instead of `ml/mr/pl/pr/left/right/text-left`, and directional icons (`arrow-right`, `chevron-right`, `external`) mirror automatically in `Icon` (#106); use `rtl:` variants for anything else. Arabic typography comes from the design language (#106, DESIGN.md): Noto Sans Arabic with Public Sans for Latin, a slightly larger scale, Noto Naskh for the display accent, never letter-spaced.

**The Arabic font loads only when Arabic is on screen.** The default font stack does not name Noto Sans Arabic (its subsets also cover arrows and symbols, so "→" would download it on English pages); Arabic switches stacks through `:lang(ar)`, and the toggle's "ع" uses the system font. Measured on a local build: 0 Arabic faces on English `/credit` and `/contractor/rfq/rfq_1042`, loaded in Arabic.

**Analytics.** Events and their properties are as in `events.ts`. The locale is tracked only on document events (`invoice_viewed`, `po_printed`), to see which language invoices are read and printed in; no other event carries it.

## Consequences

- Arabic readers see the page a moment later than English readers (after hydration), never a wrong-language frame. Accepted for a demo whose default is English.
- Every visible string must go through a dictionary; reviewers check for literal English in TSX.
- Tests should find elements by test id, not English text, so they hold in both languages; `e2e/i18n.spec.ts` covers the toggle, persistence, RTL and axe in Arabic.

## Alternatives considered

- `next-intl` or a locale segment (`/ar/...`): server-rendered Arabic and no reveal step, but doubles routes or needs request-time rendering, and touches every page at once with hours to the freeze.
- Reading a cookie on the server: makes every page dynamic, against ADR 0001.
- Arabic-Indic digits: correct Arabic, but Saudi business documents (invoices, ZATCA, bank statements) use Latin digits for figures.
