import type { ReactNode } from "react";
import { cx } from "./cx";

/** A titled region of the page. Panels sit on the page; never inside another panel. */
export function Panel({ title, aside, children, className, flush = false }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cx("rounded-lg border border-line bg-surface", className)}>
      {title ? (
        <header className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-2">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {aside ? <div className="flex flex-wrap items-center gap-2">{aside}</div> : null}
        </header>
      ) : null}
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

/**
 * Top of every working screen, laid out like the head of an attested document:
 * title, serial number, status, then the one primary action at the end.
 */
export function PageHeader({ title, serial, status, meta, actions }: { title: string; serial?: string; status?: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 border-b border-line pb-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          {status}
        </div>
        {serial || meta ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            {serial ? <span className="font-mono text-xs text-ink">{serial}</span> : null}
            {meta}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export interface Fact {
  label: string;
  value: ReactNode;
  /** Arabic form of the value, e.g. a company's registered Arabic name. */
  valueAr?: string;
}

/** Label and value pairs, set like the fields of a registration certificate. */
export function Facts({ items, columns = 2, className }: { items: Fact[]; columns?: 1 | 2 | 3; className?: string }) {
  const cols = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3" }[columns];
  return (
    <dl className={cx("grid gap-x-8 gap-y-4", cols, className)}>
      {items.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-xs text-ink-muted">{f.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">
            {f.value}
            {f.valueAr ? (
              <span lang="ar" dir="rtl" className="block text-sm font-normal text-ink-muted">
                {f.valueAr}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
