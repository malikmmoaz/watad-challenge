import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import { Icon } from "./icon";

const control =
  "w-full rounded-md border border-line-control bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle " +
  "transition-[border-color,box-shadow] duration-150 ease-out hover:border-ink-subtle " +
  "focus-visible:border-stamp focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-stamp/30 " +
  "disabled:cursor-not-allowed disabled:border-line disabled:bg-panel disabled:text-ink-subtle " +
  "aria-invalid:border-negative aria-invalid:focus-visible:outline-negative/30";

interface FieldShell {
  label: string;
  /** Format or consequence, shown before the user types. */
  hint?: string;
  /** Names the problem and the fix: "Enter a quantity above 0". */
  error?: string;
  /** Unit or currency shown inside the control, e.g. "SAR" or "tonne". */
  suffix?: string;
  optional?: boolean;
}

function Shell({ id, label, hint, error, optional, children }: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-subtle"> (optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-xs text-negative">
          <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describe = (id: string, s: FieldShell) => (s.error ? `${id}-error` : s.hint ? `${id}-hint` : undefined);

export function Input({ label, hint, error, suffix, optional, className, id: given, ...rest }: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const id = given ?? auto;
  const shell = { label, hint, error, optional };
  return (
    <Shell id={id} {...shell}>
      <div className="relative">
        <input id={id} className={cx(control, "h-10", suffix && "pe-16", className)} aria-invalid={error ? true : undefined} aria-describedby={describe(id, shell)} required={!optional && rest.required} {...rest} />
        {suffix ? <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-ink-muted">{suffix}</span> : null}
      </div>
    </Shell>
  );
}

export function Textarea({ label, hint, error, optional, className, id: given, rows = 3, ...rest }: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const id = given ?? auto;
  const shell = { label, hint, error, optional };
  return (
    <Shell id={id} {...shell}>
      <textarea id={id} rows={rows} className={cx(control, "py-2 leading-5", className)} aria-invalid={error ? true : undefined} aria-describedby={describe(id, shell)} {...rest} />
    </Shell>
  );
}

export function Select({ label, hint, error, optional, className, id: given, children, ...rest }: FieldShell & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const id = given ?? auto;
  const shell = { label, hint, error, optional };
  return (
    <Shell id={id} {...shell}>
      <div className="relative">
        <select id={id} className={cx(control, "h-10 appearance-none pe-9", className)} aria-invalid={error ? true : undefined} aria-describedby={describe(id, shell)} {...rest}>
          {children}
        </select>
        <Icon name="chevron-down" className="pointer-events-none absolute end-3 top-3 text-ink-muted" />
      </div>
    </Shell>
  );
}

export function Checkbox({ label, hint, className, id: given, ...rest }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <div className={cx("flex items-start gap-2.5", className)}>
      <input id={id} type="checkbox" className="mt-1 size-4 shrink-0 rounded-xs border-line-control disabled:cursor-not-allowed" aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm text-ink">
          {label}
        </label>
        {hint ? (
          <span id={`${id}-hint`} className="text-xs text-ink-muted">
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}
