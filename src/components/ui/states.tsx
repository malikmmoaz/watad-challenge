import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icon";

type AlertTone = "info" | "positive" | "caution" | "negative";
const alertTone: Record<AlertTone, { box: string; icon: IconName }> = {
  info: { box: "border-stamp/30 bg-stamp-soft text-stamp", icon: "info" },
  positive: { box: "border-positive/30 bg-positive-soft text-positive", icon: "check" },
  caution: { box: "border-caution/35 bg-caution-soft text-caution", icon: "alert" },
  negative: { box: "border-negative/30 bg-negative-soft text-negative", icon: "alert" },
};

/** Inline message about the thing beside it. Says what happened and what to do next. */
export function Alert({ tone = "info", title, children, action }: { tone?: AlertTone; title: string; children?: ReactNode; action?: ReactNode }) {
  const t = alertTone[tone];
  return (
    <div role={tone === "negative" ? "alert" : "status"} className={cx("flex items-start gap-3 rounded-lg border px-4 py-3", t.box)}>
      <Icon name={t.icon} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-0.5 text-ink">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

/**
 * Nothing here yet. Says what will appear and offers the action that fills it.
 * No role should land on this: seeded sample data covers every first screen.
 */
export function EmptyState({ title, children, action, icon = "document" }: { title: string; children: ReactNode; action?: ReactNode; icon?: IconName }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line-strong px-6 py-8">
      <Icon name={icon} size={20} className="text-ink-subtle" />
      <div className="max-w-prose">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-ink-muted">{children}</p>
      </div>
      {action}
    </div>
  );
}

/** Something failed to load. Names the problem and the way out. */
export function ErrorState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-negative/30 bg-negative-soft px-6 py-8">
      <Icon name="alert" size={20} className="text-negative" />
      <div className="max-w-prose">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-ink">{children}</p>
      </div>
      {action}
    </div>
  );
}

/** Placeholder with the shape of the content it stands for. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("block h-4 rounded-sm bg-[linear-gradient(90deg,var(--color-neutral-soft)_25%,var(--color-paper)_50%,var(--color-neutral-soft)_75%)] bg-[length:200%_100%] motion-safe:animate-[skeleton-sweep_1.4s_linear_infinite]", className)}
    />
  );
}

/** Loading rows for a table or list. `label` is read out to screen readers. */
export function LoadingRows({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="divide-y divide-line rounded-xl border border-line bg-surface shadow-card">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="w-2/5" />
          <Skeleton className="w-1/5" />
          <Skeleton className="ml-auto w-24" />
        </div>
      ))}
    </div>
  );
}
