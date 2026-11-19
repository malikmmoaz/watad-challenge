import { Alert, Icon, PageHeader, Table, Td, Th, THead, Tr } from "@/components/ui";
import type { DocBlock, DocPage as DocPageContent } from "@/content/types";

function Block({ block }: { block: DocBlock }) {
  switch (block.kind) {
    case "prose":
      return (
        <div className="flex max-w-prose flex-col gap-3 text-base text-ink">
          {block.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      );
    case "facts":
      return (
        <dl className="grid border-t border-line sm:grid-cols-2">
          {block.items.map((f, i) => (
            <div key={`${f.label}-${i}`} className="border-b border-line py-3 sm:odd:pe-8 sm:even:ps-8 sm:even:border-s">
              <dt className="text-xs text-ink-muted">{f.label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-ink">{f.value}</dd>
              {f.note ? <dd className="mt-1 text-sm text-ink-muted">{f.note}</dd> : null}
            </div>
          ))}
        </dl>
      );
    case "table":
      return (
        <Table caption={block.caption} minWidth={Math.max(360, block.columns.length * 170)}>
          <THead>
            <tr>
              {block.columns.map((c) => (
                <Th key={c}>{c}</Th>
              ))}
            </tr>
          </THead>
          <tbody>
            {block.rows.map((row, r) => (
              <Tr key={r}>
                {row.map((cell, c) => (
                  <Td key={c} className={c === 0 ? "font-medium text-ink" : "text-ink"}>
                    {cell}
                  </Td>
                ))}
              </Tr>
            ))}
          </tbody>
        </Table>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className="flex max-w-prose flex-col border-t border-line">
          {block.items.map((item, i) => (
            <li key={`${item.title}-${i}`} className="flex gap-4 border-b border-line py-3">
              {block.ordered ? <span className="w-5 shrink-0 font-mono text-xs leading-6 text-ink-muted">{String(i + 1).padStart(2, "0")}</span> : null}
              <div>
                <p className="text-sm font-medium text-ink">{item.title}</p>
                {item.text ? <p className="mt-0.5 text-sm text-ink-muted">{item.text}</p> : null}
              </div>
            </li>
          ))}
        </List>
      );
    }
    case "steps":
      return (
        <ol className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
          {block.items.map((s, i) => (
            <li key={`${s.title}-${i}`} className="border-t-2 border-ink pt-3">
              <p className="font-mono text-xs text-ink-muted">{s.when ?? String(i + 1).padStart(2, "0")}</p>
              <p className="mt-1 text-sm font-medium text-ink">{s.title}</p>
              {s.text ? <p className="mt-0.5 text-sm text-ink-muted">{s.text}</p> : null}
            </li>
          ))}
        </ol>
      );
    case "links":
      return (
        <ul className="flex max-w-prose flex-col border-t border-line">
          {block.items.map((l) => (
            <li key={l.href} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 border-b border-line py-2.5">
              <a href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-stamp underline decoration-stamp/35 underline-offset-[3px] hover:decoration-stamp">
                {l.label}
                <Icon name="external" size={13} label="opens in a new tab" />
              </a>
              {l.note ? <span className="text-sm text-ink-muted">{l.note}</span> : null}
            </li>
          ))}
        </ul>
      );
    case "note":
      return (
        <div className="max-w-prose">
          <Alert tone="info" title={block.title}>
            {block.text}
          </Alert>
        </div>
      );
  }
}

/**
 * Layout for the explanation pages. A contents rail on wide screens, then
 * numbered sections: a one-sentence lead that stands on its own, and one or
 * two blocks. Sections are short on purpose: each should read in under a minute.
 */
/** Fixed labels around the content, in the reader's language. */
export interface DocPageLabels {
  onThisPage: string;
  draft: string;
}

const EN_LABELS: DocPageLabels = { onThisPage: "On this page", draft: "Draft copy" };

export function DocPage({ page, labels = EN_LABELS }: { page: DocPageContent; labels?: DocPageLabels }) {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
      <PageHeader
        title={page.title}
        meta={<span>{page.summary}</span>}
        status={
          page.draft ? (
            <span data-testid="doc-draft" className="inline-flex h-6 items-center whitespace-nowrap rounded-sm border border-dashed border-caution px-2 text-xs font-medium text-caution">
              {labels.draft}
            </span>
          ) : null
        }
      />
      <div className="mt-8 grid gap-x-12 gap-y-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label={labels.onThisPage} className="lg:sticky lg:top-6 lg:self-start">
          <ol className="flex flex-wrap gap-x-5 gap-y-1 text-sm lg:flex-col lg:gap-y-0 lg:border-s lg:border-line">
            {page.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex items-baseline gap-2 py-1 text-ink-muted transition-colors duration-150 hover:text-ink lg:-ms-px lg:border-s lg:border-transparent lg:py-1.5 lg:ps-4 lg:hover:border-ink">
                  <span className="font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex min-w-0 flex-col gap-12">
          {page.sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} data-testid="doc-section" className="flex scroll-mt-6 flex-col gap-5">
              <div>
                <p className="font-mono text-xs text-ink-muted">{String(i + 1).padStart(2, "0")}</p>
                <h2 id={`${s.id}-h`} className="mt-1 text-2xl font-semibold tracking-[-0.015em] text-ink">
                  {s.title}
                </h2>
                <p className="mt-2 max-w-prose text-lg text-ink">{s.lead}</p>
              </div>
              {s.blocks.map((b, j) => (
                <Block key={j} block={b} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
