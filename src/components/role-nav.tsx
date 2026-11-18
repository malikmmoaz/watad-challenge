import Link from "next/link";
import type { Role } from "@/domain/types";
import { Icon } from "./ui";
import { ResetDemoButton } from "./reset-demo-button";
import { RestartTour } from "./reviewer-guide";
import { RoleLink } from "./role-link";

export const ROLES: { role: Role; href: string; label: string; persona: string; blurb: string }[] = [
  { role: "contractor", href: "/contractor", label: "Contractor", persona: "Najd Horizon Contracting Co.", blurb: "Upload an RFQ or order from the catalog, compare offers, place a PO and apply for a credit cap." },
  { role: "supplier", href: "/supplier", label: "Supplier", persona: "Rawasi Building Materials Trading", blurb: "See matched requests, submit offers with price, stock, lead time and terms, and track awards." },
  { role: "credit", href: "/credit", label: "Credit manager", persona: "Independent credit manager", blurb: "Review documents, gated checks and the scorecard with AI assist, then approve, decline or request more information." },
];

/**
 * App bar shared by the three role areas, in the same language as the landing
 * nav: product mark, the role switcher as pills, then the explanation pages,
 * the sample-data label and the demo reset. One line from 1024 px (About links from 1280 px); wraps below.
 */
export function RoleNav({ current }: { current: Role }) {
  return (
    <header className="z-20 border-b border-line/70 bg-paper/85 backdrop-blur-md sm:sticky sm:top-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-30 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-md text-base font-semibold tracking-[-0.01em] text-ink">
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-pine-deep text-on-pine shadow-button">
            <Icon name="arrow-right" size={14} strokeWidth={2} className="-rotate-45" />
          </span>
          <span className="sr-only sm:not-sr-only">Watad challenge demo</span>
        </Link>
        <nav aria-label="Switch role" data-testid="role-switcher" className="order-last flex w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 shadow-card text-sm sm:order-none sm:w-auto">
          {ROLES.map((r) => {
            const active = r.role === current;
            return (
              <RoleLink
                role={r.role}
                source="switcher"
                key={r.role}
                href={r.href}
                data-testid={`role-switcher-${r.role}`}
                aria-current={active ? "page" : undefined}
                className={`flex h-8 flex-1 items-center justify-center whitespace-nowrap rounded-full px-3.5 font-medium transition-colors duration-150 sm:flex-none ${
                  active ? "bg-pine-deep text-on-pine shadow-button" : "text-ink-muted hover:bg-paper hover:text-ink"
                }`}
              >
                {r.label}
              </RoleLink>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-x-2 text-sm sm:gap-x-4">
          <RestartTour />
          <Link href="/about" data-testid="nav-about" className="hidden text-ink-muted transition-colors duration-150 hover:text-ink xl:inline">
            About
          </Link>
          <Link href="/how-we-built" data-testid="nav-how-we-built" className="hidden whitespace-nowrap text-ink-muted transition-colors duration-150 hover:text-ink xl:inline">
            How we built it
          </Link>
          <span className="whitespace-nowrap rounded-full border border-dashed border-line-control px-2.5 py-0.5 text-xs text-ink-muted">Sample data · simulated AI</span>
          <ResetDemoButton />
        </div>
      </div>
    </header>
  );
}
