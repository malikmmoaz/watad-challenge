import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui";

const ROLE_LINKS = [
  { href: "/contractor", label: "Contractor" },
  { href: "/supplier", label: "Supplier" },
  { href: "/credit", label: "Credit manager" },
];

/**
 * Full-page message for "not found" and "something went wrong": the pine
 * brand bar, a plain statement, one primary action and the three roles,
 * so a reviewer is never stranded.
 */
export function StatusPage({
  code,
  title,
  children,
  action,
  testId,
}: {
  code: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  testId: string;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper" data-testid={testId}>
      <header className="bg-pine">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <Link href="/" className="rounded-sm text-base font-semibold text-on-pine focus-visible:outline-on-pine">
            Watad challenge demo
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16">
        <p className="font-mono text-sm text-ink-subtle">{code}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <div className="max-w-prose text-base text-ink-muted">{children}</div>
        <div className="flex flex-wrap items-center gap-3">
          {action ?? (
            <Link href="/" className={buttonClass("primary")}>
              Back to the start
            </Link>
          )}
        </div>
        <nav aria-label="Go to a role" className="border-t border-line pt-6 text-sm text-ink-muted">
          Or go straight to a role:{" "}
          {ROLE_LINKS.map((r, i) => (
            <span key={r.href}>
              {i > 0 ? " · " : ""}
              <Link href={r.href} className="font-medium text-stamp underline decoration-stamp/30 underline-offset-2 hover:decoration-stamp">
                {r.label}
              </Link>
            </span>
          ))}
        </nav>
      </main>
    </div>
  );
}
