---
name: Watad challenge demo
description: Construction-materials procurement and independent credit for Saudi Arabia: bold, high-contrast and evidence-led.
colors:
  paper: "oklch(0.979 0.006 155)"
  surface: "oklch(0.998 0.002 155)"
  panel: "oklch(0.948 0.01 155)"
  line: "oklch(0.895 0.012 155)"
  line-strong: "oklch(0.8 0.016 155)"
  line-control: "oklch(0.62 0.02 158)"
  ink: "oklch(0.19 0.022 162)"
  ink-muted: "oklch(0.42 0.02 160)"
  ink-subtle: "oklch(0.52 0.02 160)"
  pine: "oklch(0.255 0.05 163)"
  pine-deep: "oklch(0.2 0.04 164)"
  glow: "oklch(0.86 0.11 158)"
  glow-warm: "oklch(0.93 0.06 95)"
  pine-raised: "oklch(0.345 0.055 162)"
  on-pine: "oklch(0.955 0.02 155)"
  on-pine-muted: "oklch(0.8 0.035 158)"
  action: "oklch(0.44 0.105 156)"
  action-hover: "oklch(0.39 0.1 156)"
  action-active: "oklch(0.345 0.09 156)"
  action-soft: "oklch(0.94 0.035 156)"
  on-action: "oklch(0.99 0.01 155)"
  stamp: "oklch(0.41 0.135 266)"
  stamp-hover: "oklch(0.35 0.14 266)"
  stamp-soft: "oklch(0.945 0.025 266)"
  ai: "oklch(0.4 0.115 300)"
  ai-soft: "oklch(0.953 0.024 300)"
  ai-line: "oklch(0.78 0.07 300)"
  positive: "oklch(0.43 0.1 150)"
  positive-soft: "oklch(0.94 0.04 150)"
  caution: "oklch(0.45 0.095 70)"
  caution-soft: "oklch(0.945 0.055 85)"
  caution-mark: "oklch(0.76 0.15 75)"
  negative: "oklch(0.46 0.16 27)"
  negative-soft: "oklch(0.95 0.03 27)"
  neutral-soft: "oklch(0.93 0.008 155)"
  band-a: "oklch(0.5 0.12 152)"
  band-b: "oklch(0.62 0.13 135)"
  band-c: "oklch(0.72 0.15 70)"
  band-d: "oklch(0.52 0.18 27)"
typography:
  display:
    fontFamily: "Public Sans, Noto Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: "2.75rem"
  headline:
    fontFamily: "Public Sans, Noto Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "2rem"
  title:
    fontFamily: "Public Sans, Noto Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: "1.5rem"
  body:
    fontFamily: "Public Sans, Noto Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "1.5rem"
    fontFeature: "'tnum' 1, 'lnum' 1"
  data:
    fontFamily: "Public Sans, Noto Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.25rem"
    fontFeature: "'tnum' 1, 'lnum' 1"
  label:
    fontFamily: "Public Sans, Noto Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1.125rem"
  serial:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1.125rem"
rounded:
  xs: "2px"
  sm: "3px"
  md: "6px"
  lg: "10px"
  xl: "14px"
  2xl: "22px"
  full: "999px"
spacing:
  control-gap: "8px"
  field-gap: "20px"
  panel-padding: "16px"
  section-gap: "24px"
  page-gutter: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-quiet:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.negative}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 12px"
  badge:
    backgroundColor: "{colors.neutral-soft}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
    height: "24px"
    padding: "0 8px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  shell-bar:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.on-pine}"
---

# Design System: Watad challenge demo

Tokens live in `src/styles/tokens.css` (Tailwind v4 `@theme`), components in `src/components/ui`, and a live reference at `/design-system`. This file says when to use each.

## Overview

**Creative North Star: "The attested document, presented with conviction"**

*Direction updated 18 Nov 2026 at Malik's request ("it needs that wow factor… we are not mediocre"): the evidence-first rules below stay; the presentation becomes bold, high-contrast and product-forward, taking its moves from five reference sites (see Inspiration). This applies to every screen, not only the landing page.*

Every number on screen can show the paper it came from. The interface borrows from Saudi attested documents (a Commercial Registration, a ZATCA or Zakat certificate): pale green-tinted security paper, a pine-green shell, hairline rules, small radii, a serial number under every title, and an ink seal beside any figure a document backs.

Working screens stay dense and exact: tabular figures, tables whose columns never move. Around them the system is confident: oversized tight display type, near-black ink on bright surfaces, cards that rest on a whisper of shadow and lift on hover, a deep pine ground for the moments that matter, and short entrance motion. Colour is rationed by meaning. Green is for things you can press, stamp-ink blue is for evidence, violet with a dashed edge is for simulated AI, and amber and red appear only as state.

**Key Characteristics:**
- Light theme only: an office desk, daylight, a laptop.
- Cards rest on `shadow-card` and lift to `shadow-raised` on hover; the showcased product floats on `shadow-float`. A card inside a card is still avoided: use a borderless tinted well instead.
- Reasons sit beside the thing they explain, never behind a tooltip.
- The same fields in the same order for every supplier and every offer, so no supplier is favoured by layout.
- Status is always a word and a shape as well as a colour.

## Colors

A green-tinted neutral ground with one action colour and three meaning colours.

### Primary
- **Action green** (`action`, oklch(0.44 0.105 156)): primary buttons, the "Enter as" links on the landing page, the selected row tint (`action-soft`). Nothing that cannot be pressed takes it.
- **Pine** (`pine`, oklch(0.285 0.048 162)): the shell bar and rail only. Text on it is `on-pine` or `on-pine-muted`.

### Secondary
- **Stamp-ink blue** (`stamp`, oklch(0.41 0.135 266)): evidence. The attestation seal, links to source documents, informational badges, and the focus ring.

### Tertiary
- **Simulated-AI violet** (`ai`, oklch(0.4 0.115 300)): only inside `AiLabel` and AI panels, always with a dashed edge and the words "Simulated AI".

### Neutral
- **Paper** (`paper`): the page ground. **Surface** (`surface`): panels, tables, inputs. **Panel** (`panel`): table heads and disabled fills.
- **Line** (`line`) for rules and panel edges; **line-strong** for emphasised rules; **line-control** for the edges of inputs and secondary buttons (3.5:1 on surface).
- **Ink** (`ink`) for values and titles, **ink-muted** for labels and notes, **ink-subtle** for placeholders and upcoming steps.

### State
- **Positive**, **caution**, **negative**, each with a `-soft` fill. Text in the strong tone on its soft fill is at least 6.4:1.
- **Credit bands** `band-a` to `band-d` (A from 80, B from 65, C from 50, D below: the scoring engine's cut-offs): fills on the score scale only, never text colours. The band is always named in words beside the score.

### Named Rules
**The Pressable Green Rule.** Action green appears only on things that can be pressed. A success state uses `positive` and a check, not the action colour.

**The Roles-Only Rule.** New code uses the role names above, never default Tailwind colours (`text-neutral-600`, `bg-amber-50`). The default palette is still loaded while existing screens are migrated in #7 and is switched off after that.

## Typography

**Display and body font:** Public Sans (with Noto Sans Arabic, system-ui)
**Accent serif:** Instrument Serif italic, for one phrase in the landing hero headline only
**Serial font:** Geist Mono
**Arabic font:** Noto Sans Arabic, on any element with `lang="ar"`

**Character:** one plain, official-looking sans does the work; display sizes are set very large and tight (`--tracking-display` -0.045em) so headlines carry the page. The serif appears once, as a voice, never as a system. Figures are tabular and lining everywhere so money lines up.

### Hierarchy
- **Display** (600, `text-5xl` to `text-7xl`, 3.5 to 5.5rem, tracking -0.045em): landing headline, section openers and big numbers.
- **Section** (600, `text-4xl`/`text-5xl`, tracking -0.035em): landing section headings; the closing phrase may take the action or glow colour.
- **Headline** (600, `text-3xl`, tracking -0.025em): the page title in `PageHeader`, one `h1` per page.
- **Title** (600, `text-lg` 1.0625rem; panel titles use `text-sm` 600): section leads and panel headers.
- **Body** (400, `text-base` 0.9375rem / 1.5rem): prose, at most about 70 characters wide (`max-w-prose`).
- **Data** (400 or 500, `text-sm` 0.8125rem / 1.25rem): tables, controls, facts.
- **Label** (400, `text-xs` 0.75rem): field hints, column heads, cell notes. 
- **Serial** (Geist Mono, `text-xs`): RFQ, PO, CR and document numbers only.

### Named Rules
**The Exact Money Rule.** Amounts come from `formatSar()` and are never abbreviated ("SAR 298,200.00", not "298K"). State whether VAT is included. Financing cost reads "profit rate" or "Murabaha markup" with APR beside it; the word "interest" never appears.

**The Sentence Case Rule.** Sentence case everywhere. Uppercase is reserved for the decision stamp.

## Layout

- Role areas: the pine bar across the top (product name, role switcher, sample-data note), then a `max-w-6xl` column with 16px gutters on phones and 32px from `sm`. `AppShell` offers the same world as a left rail for screens that need section navigation.
- Every working screen starts with `PageHeader`: title, status badge, serial and meta beneath, and the one primary action at the end.
- Vertical rhythm: 24px between page regions, 16px inside panels, 20px between form fields, 6px between a label and its control.
- Side-by-side panels use `grid gap-4 lg:grid-cols-2` and stack below `lg`. Tables keep a minimum width and scroll sideways inside their own frame on phones; the page itself never scrolls sideways.
- Numbers and money align to the end of their column.

## Elevation & Depth

Tone first, then a short shadow scale. `paper` under `surface`, separated by a 1px `line`; cards add a whisper of shadow so they read as objects.

### Shadow Vocabulary
- **Card** (`shadow-card`): resting panels, tables, secondary buttons.
- **Raised** (`shadow-raised`): hover on interactive cards; the dark bento card.
- **Float** (`shadow-float`): the framed product showcase only.
- **Leaf** (`shadow-leaf`): dialogs, popovers, document previews.
- **Button** (`shadow-button`): primary and inverse buttons; a 1px top highlight.
- **Press** (`shadow-press`): inset, while a button is held.

### Motion
- `animate-rise` (700 ms) for the hero's entrance, staggered 80 ms; `animate-fade` when a showcase tab changes; `animate-drift` for background glow only.
- Always behind `motion-safe:`; under `prefers-reduced-motion` everything is static.
- Hover lifts are 2px at most. Nothing moves on its own except background glow.
- Entrances move but never fade text: text is at full contrast in every frame (an accessibility check sampling mid-animation must pass).

### Named Rules
**The No Nested Cards Rule.** A card never sits inside another card. Group content inside a card with a hairline, a heading, or a borderless tinted well (`bg-paper`).

## Shapes

Radii: 6px on controls, 10px on buttons, 14px on panels and tables, 22px on landing cards and the product frame, full pills for tabs and hero calls to action, 3px on badges. Edges are 1px hairlines. Dashed edges mean "not real": simulated AI, sample data, and empty states. The only rotated element is the stamp (and the small seal mark).

## Components

All exported from `@/components/ui`.

### Buttons (`Button`)
- **Primary:** action green, one per view, for the action the page exists for.
- **Secondary** (default), **quiet** (toolbar and cancel), **danger** (outlined red: decline, cancel a PO).
- Sizes `md` (40px) and `sm` (32px, table rows). `loading` keeps the label and blocks a second press.
- Labels name the action: "Place PO", "Submit offer", "Request more information". Never "OK" or "Submit".

### Inputs (`Input`, `Select`, `Textarea`, `Checkbox`)
- Label above, hint below, unit inside the control via `suffix` ("SAR / tonne", "days").
- `error` replaces the hint, turns the edge red, and names the problem and the fix: "Enter a lead time of at least 1 day".
- Mark the few optional fields with `optional`; do not star the required ones.

### Badges and labels (`Badge`, `AiLabel`, `SampleDataLabel`)
- `Badge` tones: neutral, info, positive, caution, negative. Each has an icon so it reads in greyscale.
- `AiLabel` is required wherever simulated AI produced what is shown; pass the `agent` and `confidence` from the `SimulatedAi` type.
- `SampleDataLabel` wherever sample companies or figures could be read as real.

### Tables (`Table`, `THead`, `Th`, `Tr`, `Td`, `CellNote`)
- `caption` is required and is read to screen readers.
- Row `state`: `recommended`, `selected`, `muted`. State restyles the row; it never adds, removes or reorders a column.
- `CellNote` carries the second line: a spec, a city, a match reason.

### Panels and page head (`Panel`, `PageHeader`, `Facts`)
- `Panel`: white surface, hairline edge, optional titled header with an `aside` for labels.
- `Facts`: label and value pairs set like the fields of a certificate; `valueAr` adds the Arabic form beneath.

### Signature: evidence and decisions (`EvidenceSeal`, `NoEvidence`, `DecisionStamp`)
- `EvidenceSeal` marks a value a document backs and opens that document. `source` names the document and the place in it: "ZATCA VAT return Q3 2026, box 6".
- `NoEvidence` (amber text) for a value nothing on file supports. It is never drawn as a seal.
- `DecisionStamp` prints a decision a named person made: approved, more information requested, declined (it also accepts the domain outcomes `approve`, `request_info`, `decline`). AI proposals never get a stamp.

### Score and credit (`ScoreScale`, `FactorBar`, `CreditCapMeter`)
- `ScoreScale`: the score on a ruled 0 to 100 scale with band and outcome in words. Pass the scoring engine's own bands if they differ from `creditBands`.
- `FactorBar`: points earned out of the weight a factor carries, with a one-line reason.
- `CreditCapMeter`: drawn, this PO, and what is left. A PO that passes the cap shows the overflow in red past a hard edge.

### Time (`StatusTimeline`, `LeadTimeBar`)
- `StatusTimeline`: oldest first, exactly one `current` step, each step with who moved it and when. A step the case did not need is `skipped` (dashed, "not needed").
- `LeadTimeBar`: length is duration. Every bar in one comparison shares `maxDays`; the tick is the required-by date.

### States (`EmptyState`, `LoadingRows`, `Skeleton`, `ErrorState`, `Alert`)
- Empty states say what will appear and offer the action that fills it. No role lands on one: seeded sample data covers every first screen.
- Errors say what happened, that nothing was lost (when true), and the way out.
- Loading uses skeleton rows shaped like the content, not a spinner in the middle of the page.

### Navigation (`RoleNav`, `AppShell`)
- The current role is the light pill on the pine bar; others are `on-pine-muted` and lighten on hover. Focus rings on pine are `on-pine`.

### Landing page (`/`)
- **Headline first.** Centred, `text-7xl` at desktop, two lines: a roman statement and one italic serif phrase in action green.
- **One click in.** The three roles sit directly under the headline as raised cards (`data-testid="role-<role>"`), each with what is waiting for that role. The "Sample data · simulated AI" label sits just above them.
- **The product is the hero image.** A framed browser window (`shadow-float`) with a pill switcher above it previews each role using the app's own components on the seeded data. The switcher only previews; the role cards are the way in.
- **Rhythm:** hero → document strip (the Saudi paper trail) → four big numbers → bento of the four steps with live specimens (one dark card) → dark pine "Agents prepare. Humans decide." → closing call with all three roles → footer with About / How we built.
- **No invented proof.** No customer logos, testimonials or funding lines (PRODUCT.md); the document strip and the numbers take the place of a logo row.
- **No kicker labels** above section headings and no icon tiles stacked over card titles: put the icon inline with the heading.

## Do's and Don'ts

### Do:
- **Do** use Watad's terms: "offers", "credit cap", "neutral platform", RFQ, PO.
- **Do** put the reason beside the result: a match reason under the supplier, a factor note under its bar, a seal under the figure.
- **Do** give every status a word and an icon as well as a colour.
- **Do** keep one primary button per view.
- **Do** keep the default focus ring (2px `stamp`, 2px offset); on pine use `focus-visible:outline-on-pine`.
- **Do** label simulated AI with `AiLabel` and sample data with `SampleDataLabel`.

### Don't:
- **Don't** use default Tailwind colours (`neutral-*`, `amber-*`, `gray-*`) in new code; they are being migrated out and will be switched off.
- **Don't** put action green on anything that cannot be pressed.
- **Don't** nest a bordered card inside another card; use a tinted well.
- **Don't** write "interest", "quote" or "bid" (except the first mention "offers (bids)" on the PO flow), and don't round or abbreviate money.
- **Don't** stamp or seal anything a simulated AI produced.
- **Don't** add a dark theme or a second typeface.

## Arabic and right to left

The whole product runs in Arabic, right to left, with the same design language. Live specimen: the "Arabic, right to left" section of `/design-system`.

- **Direction:** layout uses logical properties only (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`, `insetInlineStart` in inline styles). Never `ml-`, `pr-`, `left-`, `text-right` and the like in new code.
- **Icons:** `arrow-right`, `chevron-right` and `external` mirror automatically under `dir="rtl"` (`Icon` adds `rtl:-scale-x-100`). Hover nudges along the reading direction need an `rtl:` counterpart (`group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5`).
- **Bars and meters** fill from the reading start: score bands, the credit cap meter, factor bars and lead-time bars flip with the direction; the band marker and cap edge are placed with `insetInlineStart`.
- **Numbers:** Western digits and `SAR`/`ر.س` amounts stay left to right inside Arabic text; money and counts still align to the column end (`text-end`).
- **Type:** Arabic sets in Noto Sans Arabic (400 / 600 / 700) with Public Sans as the fallback for Latin names, codes and digits. The scale steps up about 7% with looser leading (display 1.2, body 1.75rem). Arabic is **never letter-spaced**: tracking breaks the joins, so all tracking is zeroed under `lang="ar"`.
- **Display accent:** the phrase set in Instrument Serif italic in English is set in **Noto Naskh Arabic 700** in Arabic: Arabic has no italic, and the classical Naskh against the sans gives the same contrast. Write it as `font-serif`; the swap is automatic.
- **Copy** is written in Arabic in Watad's terms (عروض، حد ائتماني، أمر شراء، ربح المرابحة مع معدل النسبة السنوي), never translated word for word.

## Inspiration

Five reference sites, re-studied on 18 Nov 2026 from 1440-wide renders (phonic.ai from its first three screens). We take patterns, never their copy, logos, illustrations or exact layouts. Where a reference conflicts with a rule in this file, the rule wins.

| Reference | What we took | Where it lives here |
| --- | --- | --- |
| meelio.io | An oversized, very tight sans headline with one phrase set in an italic serif; the product in a browser frame directly under the hero. | Hero headline (`text-7xl`, -0.045em) with "with credit you can trace." in Instrument Serif italic; the framed product showcase. |
| firecrawl.dev | A faint drawn grid behind the hero; numbered section counters; real product UI inside feature cards. | Masked grid backdrop in the hero; `[ 01 / 04 ]` counters on the bento cards, each holding a live component. |
| phonic.ai | A live, interactive product panel as the hero's proof; three feature cards; a dark "how it works" band. | The role switcher that changes the product preview; the dark pine trust section with three cards. |
| amboras.com | A row of big numbers; a bento grid of product surfaces with one dark tile. | Four big numbers from the seed data; the bento of the four steps with the credit card in dark pine. |
| nabrah.ai | A soft colour wash behind the hero; a pill tab switcher right under the hero for its products; dark pill calls to action. | Green and warm glows drifting behind the hero; the pill switcher for Contractor / Supplier / Credit manager; pill CTAs in the nav and closing section. |

**Applied to the whole product:** higher contrast ink and brighter surfaces; display type scale and heading tracking; larger radii; card, raised and float shadows; `Button` gains `lg` and `inverse`; `Panel`, `Table` and states rest on `shadow-card`; `PageHeader` titles at `text-3xl` with an optional eyebrow; motion primitives `animate-rise`, `animate-fade`, `animate-drift`.

**Not taken, on purpose:** announcement banners, funding lines, customer logos and testimonials (no such evidence exists, and PRODUCT.md forbids inventing it); orange, blue and violet brand washes (green stays our only action colour; violet stays reserved for simulated AI); kicker labels above every heading and icon tiles over card titles (flagged by impeccable as generic).
