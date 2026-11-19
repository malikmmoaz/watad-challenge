import type { ReactNode } from "react";
import { cx } from "./cx";

/** A titled region of the page. Panels sit on the page; never inside another panel. */
export function Panel({ title, aside, children, className, flush = false }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cx("min-w-0 rounded-xl border border-line bg-surface shadow-card", className)}>
      {title ? (
        <header className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-2.5">
          <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {aside ? <div className="flex flex-wrap items-center gap-2">{aside}</div> : null}
        </header>
      ) : null}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

/**
 * Top of every working screen, laid out like the head of an attested document:
 * title, serial number, status, then the one primary action at the end.
 */
export function PageHeader({ title, serial, status, meta, actions, eyebrow }: { title: string; serial?: string; status?: ReactNode; meta?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-line pb-6">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-2 font-mono text-xs uppercase tracking-[var(--tracking-eyebrow)] text-ink-muted rtl:font-sans rtl:font-medium">{eyebrow}</p> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-3xl font-semibold tracking-[var(--tracking-heading)] text-ink">{title}</h1>
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

export interface Stat {
  label: string;
  value: ReactNode;
  /** One short line under the label, e.g. what the number includes. */
  note?: string;
  /** Long values such as SAR amounts: set smaller so they never wrap. */
  compact?: boolean;
}

/**
 * The figures a screen opens on: big numbers on an ink rule, two to four per
 * row. Values are exact (money through formatSar, never abbreviated).
 */
export function StatStrip({ items, className }: { items: Stat[]; className?: string }) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[Math.min(4, Math.max(2, items.length)) as 2 | 3 | 4];
  return (
    <dl className={cx("grid gap-x-8 gap-y-6", cols, className)}>
      {items.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col border-t-2 border-ink pt-3">
          <dt className="order-2 mt-1 text-sm text-ink-muted">{s.label}</dt>
          <dd className={cx("order-1 flex h-11 items-end font-semibold tabular-nums text-ink", s.compact ? "text-2xl tracking-[-0.02em]" : "text-4xl tracking-[-0.035em]")}>{s.value}</dd>
          {s.note ? <dd className="order-3 text-xs text-ink-subtle">{s.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
