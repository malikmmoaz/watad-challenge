import { T } from "@/components/i18n/t";
import { common } from "@/i18n/common";
import { msg } from "@/i18n/core";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./icon";

export interface TimelineStep {
  label: string;
  /** `skipped`: a step this case did not need, e.g. "More information requested". */
  state: "done" | "current" | "upcoming" | "problem" | "skipped";
  /** Already formatted: "18 Nov 2026, 14:20". */
  at?: string;
  /** Who moved it: "Supplier", "Platform". */
  actor?: string;
  note?: ReactNode;
}

const dot: Record<TimelineStep["state"], string> = {
  done: "border-positive bg-positive text-on-action",
  current: "border-ink bg-surface text-ink",
  upcoming: "border-line-strong bg-paper text-transparent",
  problem: "border-negative bg-negative text-on-action",
  skipped: "border-dashed border-line-strong bg-paper text-ink-subtle",
};

/** Status of a PO or a credit application, oldest first. One step is current. */
export function StatusTimeline({ steps, label }: { steps: TimelineStep[]; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={s.label} aria-current={s.state === "current" ? "step" : undefined} className="relative flex gap-3 pb-5 last:pb-0">
            {last ? null : <span aria-hidden="true" className={cx("absolute start-[9px] top-5 h-full w-px", s.state === "done" ? "bg-positive" : "bg-line-strong")} />}
            <span className={cx("relative mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full border-[1.5px]", dot[s.state])}>
              {s.state === "done" ? <Icon name="check" size={11} strokeWidth={2.25} /> : null}
              {s.state === "problem" ? <Icon name="x" size={11} strokeWidth={2.25} /> : null}
              {s.state === "current" ? <span className="size-[7px] rounded-full bg-ink" /> : null}
              {s.state === "skipped" ? <Icon name="minus" size={11} strokeWidth={2.25} /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cx("text-sm", s.state === "upcoming" || s.state === "skipped" ? "text-ink-subtle" : "font-medium text-ink")}>
                {s.label}
                <span className="sr-only">
                  <T m={msg(common, (m) => m.ui.step[s.state])} />
                </span>
              </p>
              {s.at || s.actor ? (
                <p className="text-xs text-ink-muted">{[s.at, s.actor].filter(Boolean).join(" · ")}</p>
              ) : null}
              {s.note ? <div className="mt-1 text-sm text-ink-muted">{s.note}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Lead time drawn to scale: every bar in a comparison shares `maxDays`, so a
 * bar twice as long is a delivery twice as far away. The tick is the required-by date.
 */
export function LeadTimeBar({ days, maxDays, requiredInDays }: { days: number; maxDays: number; requiredInDays?: number }) {
  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / maxDays) * 100))}%`;
  const late = requiredInDays !== undefined && days > requiredInDays;
  return (
    <div className="min-w-28">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="tabular-nums text-ink">
          <T m={days === 1 ? msg(common, (m) => m.ui.dayOne) : days === 2 ? msg(common, (m) => m.ui.dayTwo) : days <= 10 ? msg(common, (m) => m.ui.dayFew) : msg(common, (m) => m.ui.dayMany)} values={{ n: days }} />
        </span>
        {requiredInDays === undefined ? null : <span className={cx("text-xs", late ? "text-negative" : "text-ink-muted")}>{late ? <T m={msg(common, (m) => m.ui.late)} values={{ n: days - requiredInDays }} /> : <T m={msg(common, (m) => m.ui.inTime)} />}</span>}
      </div>
      <div className="relative mt-1.5 h-1.5 rounded-full bg-neutral-soft" aria-hidden="true">
        <span className={cx("absolute inset-y-0 start-0 rounded-full", late ? "bg-negative" : "bg-ink-muted")} style={{ width: pct(days) }} />
        {requiredInDays === undefined ? null : <span className="absolute -inset-y-1 w-px bg-ink" style={{ insetInlineStart: pct(requiredInDays) }} />}
      </div>
    </div>
  );
}
