import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cx } from "./cx";

/**
 * Data table. Columns keep their order and width in every state; a row's
 * state (recommended, selected, muted) restyles the row, never the grid.
 * Wide tables scroll sideways inside their own frame on small screens.
 */
export function Table({ caption, children, className, minWidth = 640 }: { caption: string; children: ReactNode; className?: string; minWidth?: number }) {
  return (
    <div className={cx("relative overflow-x-auto rounded-xl border border-line bg-surface shadow-card", className)} tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-line-strong bg-panel text-xs text-ink-muted">{children}</thead>;
}

type Align = "start" | "end";
const alignClass: Record<Align, string> = { start: "text-left", end: "text-right" };

/** Numbers and money align to the end so digits line up. */
export function Th({ align = "start", className, children, ...rest }: { align?: Align } & Omit<ThHTMLAttributes<HTMLTableCellElement>, "align">) {
  return (
    <th scope="col" className={cx("h-9 whitespace-nowrap px-3 font-medium", alignClass[align], className)} {...rest}>
      {children}
    </th>
  );
}

export type RowState = "default" | "recommended" | "selected" | "muted";
const rowState: Record<RowState, string> = {
  default: "",
  recommended: "bg-positive-soft/50",
  selected: "bg-action-soft",
  muted: "text-ink-subtle",
};

export function Tr({ state = "default", className, children, ...rest }: { state?: RowState } & HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cx("border-b border-line last:border-b-0", rowState[state], className)} aria-selected={state === "selected" || undefined} {...rest}>
      {children}
    </tr>
  );
}

export function Td({ align = "start", className, children, ...rest }: { align?: Align } & Omit<TdHTMLAttributes<HTMLTableCellElement>, "align">) {
  return (
    <td className={cx("px-3 py-2.5 align-top", alignClass[align], align === "end" && "whitespace-nowrap tabular-nums", className)} {...rest}>
      {children}
    </td>
  );
}

/** Second line inside a cell: a spec, a brand, a reason. */
export function CellNote({ children }: { children: ReactNode }) {
  return <div className="text-xs text-ink-muted">{children}</div>;
}
