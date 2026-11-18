import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "quiet" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium " +
  "transition-[background-color,border-color,color,box-shadow] duration-150 ease-out " +
  "disabled:cursor-not-allowed aria-busy:cursor-progress";

const variants: Record<Variant, string> = {
  primary:
    "bg-action text-on-action hover:bg-action-hover active:bg-action-active active:shadow-press " +
    "disabled:bg-neutral-soft disabled:text-ink-subtle",
  secondary:
    "border border-line-control bg-surface text-ink hover:border-ink-subtle hover:bg-paper active:bg-panel active:shadow-press " +
    "disabled:border-line disabled:text-ink-subtle disabled:bg-paper",
  quiet: "text-ink-muted hover:bg-panel hover:text-ink active:bg-line disabled:text-ink-subtle disabled:hover:bg-transparent",
  danger:
    "border border-negative text-negative bg-surface hover:bg-negative-soft active:shadow-press " +
    "disabled:border-line disabled:text-ink-subtle disabled:bg-paper",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows progress and blocks a second press. Keep the label; it names what is happening. */
  loading?: boolean;
  icon?: ReactNode;
}

/**
 * One primary button per view: the single action the page exists for.
 * Labels name the action ("Place PO", "Submit offer"), never "OK" or "Submit".
 */
export function Button({ variant = "secondary", size = "md", loading = false, icon, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.75" />
      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
