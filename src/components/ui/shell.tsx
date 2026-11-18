import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";

export interface NavItem {
  href: string;
  label: string;
  /** Count of things waiting on this role, e.g. offers to review. */
  count?: number;
}

/**
 * App frame for all three roles: the pine rail carries role and navigation,
 * the paper ground carries the work. On small screens the rail becomes a top bar.
 */
export function AppShell({ role, org, nav, current, footer, children }: { role: string; org: string; nav: NavItem[]; current: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink">
        Skip to content
      </a>
      <aside className="flex shrink-0 flex-col bg-pine text-on-pine lg:sticky lg:top-0 lg:h-dvh lg:w-60">
        <div className="flex items-center justify-between gap-4 px-4 pt-4 lg:block lg:px-5 lg:pt-6">
          <Link href="/" className="text-base font-semibold text-on-pine">
            Watad
          </Link>
          <p className="text-xs text-on-pine-muted lg:mt-5">
            {role}
            <span className="block text-sm font-medium text-on-pine">{org}</span>
          </p>
        </div>
        <nav aria-label={`${role} navigation`} className="mt-3 overflow-x-auto px-2 pb-2 lg:mt-6 lg:px-3">
          <ul className="flex gap-1 lg:flex-col">
            {nav.map((item) => {
              const active = item.href === current;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex h-9 items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 text-sm transition-colors duration-150 focus-visible:outline-on-pine",
                      active ? "bg-pine-raised font-medium text-on-pine" : "text-on-pine-muted hover:bg-pine-raised/60 hover:text-on-pine",
                    )}
                  >
                    {item.label}
                    {item.count ? <span className="rounded-full bg-on-pine px-1.5 text-xs font-semibold text-pine">{item.count}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {footer ? <div className="mt-auto hidden px-5 pb-5 text-xs text-on-pine-muted lg:block">{footer}</div> : null}
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
