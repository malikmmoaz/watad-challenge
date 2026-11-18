/**
 * Content model for the explanation pages (/about, /how-we-built).
 * Copy lives in `src/content/*.ts` so it can be edited without touching layout.
 * Keep each section readable in under a minute: one lead sentence and one block.
 */
export type DocBlock =
  /** One or two short paragraphs. */
  | { kind: "prose"; paragraphs: string[] }
  /** Label and value pairs, e.g. stack choices. `note` is the reason. */
  | { kind: "facts"; items: { label: string; value: string; note?: string }[] }
  /** Small table. Keep to four columns and about six rows. */
  | { kind: "table"; caption: string; columns: string[]; rows: string[][] }
  /** Ordered when the order means something (priorities, steps). */
  | { kind: "list"; ordered?: boolean; items: { title: string; text?: string }[] }
  /** A process, oldest first. */
  | { kind: "steps"; items: { title: string; text?: string; when?: string }[] }
  /** Links out to the evidence: issues, PRs, CI runs, ADRs. */
  | { kind: "links"; items: { label: string; href: string; note?: string }[] }
  /** A short callout, e.g. a wording rule. */
  | { kind: "note"; title: string; text: string };

export interface DocSection {
  /** Anchor id, kebab-case. */
  id: string;
  title: string;
  /** One sentence that answers the section's question on its own. */
  lead: string;
  blocks: DocBlock[];
}

export interface DocPage {
  title: string;
  /** One line under the title. */
  summary: string;
  /** True while the copy is placeholder text; shows a "Draft copy" label. */
  draft: boolean;
  sections: DocSection[];
}
