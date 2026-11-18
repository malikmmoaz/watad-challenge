---
name: Watad challenge demo
description: Construction-materials procurement and independent credit for Saudi Arabia, set like an attested document.
colors:
  paper: "oklch(0.972 0.007 155)"
  surface: "oklch(0.995 0.003 155)"
  panel: "oklch(0.948 0.01 155)"
  line: "oklch(0.895 0.012 155)"
  line-strong: "oklch(0.8 0.016 155)"
  line-control: "oklch(0.62 0.02 158)"
  ink: "oklch(0.235 0.022 160)"
  ink-muted: "oklch(0.43 0.022 160)"
  ink-subtle: "oklch(0.52 0.02 160)"
  pine: "oklch(0.285 0.048 162)"
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
  md: "5px"
  lg: "8px"
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

**Creative North Star: "The attested document"**

Every number on screen can show the paper it came from. The interface borrows from Saudi attested documents (a Commercial Registration, a ZATCA or Zakat certificate): pale green-tinted security paper, a pine-green shell, hairline rules, small radii, a serial number under every title, and an ink seal beside any figure a document backs.

It is calm and dense in the way a well-set form is: one type family, tabular figures, tables whose columns never move. Colour is rationed by meaning. Green is for things you can press, stamp-ink blue is for evidence, violet with a dashed edge is for simulated AI, and amber and red appear only as state.

**Key Characteristics:**
- Light theme only: an office desk, daylight, a laptop.
- Two plies: the page, and one raised leaf. No cards inside cards.
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
**Serial font:** Geist Mono
**Arabic font:** Noto Sans Arabic, on any element with `lang="ar"`

**Character:** one plain, official-looking sans does everything; rank comes from size and weight, not from a second family. Figures are tabular and lining everywhere so money lines up.

### Hierarchy
- **Display** (600, `text-4xl` 2.5rem / 2.75rem): the credit score figure and the landing headline.
- **Headline** (600, `text-2xl` 1.5rem / 2rem): the page title, one `h1` per page.
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

Flat. Depth is carried by tone: `paper` under `surface`, separated by a 1px `line`. There are two plies only.

### Shadow Vocabulary
- **Leaf** (`shadow-leaf`): the single raised leaf, for a dialog, a popover or a document preview. Never on panels at rest.
- **Press** (`shadow-press`): inset, on a button while it is held.

### Named Rules
**The Two-Ply Rule.** A panel never sits inside another panel. If content needs grouping inside a panel, use a hairline rule or a heading.

## Shapes

Small radii, like a printed form: 5px on controls, 8px on panels and tables, 3px on badges. Edges are 1px hairlines. Dashed edges mean "not real": simulated AI, sample data, and empty states. The only rotated element is the stamp (and the small seal mark).

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
- **One sheet.** The hero is a single ruled sheet with crop marks at its corners: a mono strip naming the flow, the headline (`text-6xl`, 600, tracking -0.025em, at most three lines), a register of what is on file, and the three parties as cells of one ruled row. The parties are not floating cards.
- **One click in.** Each party cell is one link (`data-testid="role-<role>"`) ending in an action-green bar, with a live line saying what is waiting for that role.
- **Live specimens, not screenshots.** "One order, four steps" renders the app's own components on the seeded data: RFQ lines, offers with `LeadTimeBar`, a PO's status, `CreditCapMeter` and a `DecisionStamp`.
- **No invented proof.** There are no customers or testimonials (see PRODUCT.md), so the proof slot states how the product earns trust instead.
- Display sizes `text-5xl` and `text-6xl` are for this page's headline only.

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
- **Don't** nest a panel inside a panel, or add a shadow to a panel at rest.
- **Don't** write "interest", "quote" or "bid" (except the first mention "offers (bids)" on the PO flow), and don't round or abbreviate money.
- **Don't** stamp or seal anything a simulated AI produced.
- **Don't** add a dark theme or a second typeface.

## Inspiration

Five reference sites were studied on 18 Nov 2026 (rendered at 1440 wide). We take patterns, never copy, logos, illustrations or layouts. Each pattern is translated into the attested-document world above; where a reference conflicts with a rule in this file, the rule wins.

| Reference | Pattern we take | How it maps here |
| --- | --- | --- |
| meelio.io | A very large, tightly tracked headline with a small mono line above it; the product itself directly under the hero; a strip of plain facts. | Headline at `text-6xl` with -0.025em tracking; the mono strip names the flow (RFQ → offers → PO → credit); the fact strip becomes the register of what is on file. We keep one type family and sentence case (no italic serif, no uppercase). |
| firecrawl.dev | Page structure drawn with visible hairlines and registration marks; a working product control inside the hero. | Ruled sheets with crop marks, which is how an attested form is already built. The working control is the three role entries: one click and the reviewer is inside the product. |
| phonic.ai | A left-aligned hero with the live product beside it and at most two actions; a restrained warm-neutral ground. | Left-aligned headline with the live register beside it; actions are limited to the three role entries. Our ground stays the green-tinted paper. |
| amboras.com | A short headline, small buttons, then product surfaces straight away, with generous white space and no decoration. | No illustration and no gradient: the second section is already product ("One order, four steps"). Section headings are short (`text-3xl`). |
| nabrah.ai/en | A product switcher right under the hero for its three products; a numbered step-by-step section; an Arabic toggle. | Three parties under the headline, each with what is waiting for them; the flow as four numbered steps with serials (01 · rfq_1042). The Arabic toggle stays optional for the polish pass. |

**Not taken, on purpose:** announcement banners, funding and customer-logo rows, testimonials and pricing tables (we have no such evidence and PRODUCT.md forbids inventing it); orange and violet brand accents (action green stays the only pressable colour); scroll-driven animation (motion stays at 150 ms state changes).
