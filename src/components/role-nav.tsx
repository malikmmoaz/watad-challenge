import Link from "next/link";
import type { Role } from "@/domain/types";
import { ResetDemoButton } from "./reset-demo-button";
import { RoleLink } from "./role-link";

export const ROLES: { role: Role; href: string; label: string; persona: string; blurb: string }[] = [
  { role: "contractor", href: "/contractor", label: "Contractor", persona: "Najd Horizon Contracting Co.", blurb: "Upload an RFQ or order from the catalog, compare offers, place a PO and apply for a credit cap." },
  { role: "supplier", href: "/supplier", label: "Supplier", persona: "Rawasi Building Materials Trading", blurb: "See matched requests, submit offers with price, stock, lead time and terms, and track awards." },
  { role: "credit", href: "/credit", label: "Credit manager", persona: "Independent credit manager", blurb: "Review documents, gated checks and the scorecard with AI assist, then approve, decline or request more information." },
];

/** Pine bar shared by the three role areas: product name, role switcher, demo controls. */
export function RoleNav({ current }: { current: Role }) {
  const persona = ROLES.find((r) => r.role === current)?.persona;
  return (
    <header className="bg-pine text-on-pine">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-8">
        <Link href="/" className="rounded-sm text-base font-semibold text-on-pine focus-visible:outline-on-pine">
          Watad challenge demo
        </Link>
        <nav aria-label="Switch role" data-testid="role-switcher" className="flex gap-1 text-sm">
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
                className={`flex h-8 items-center whitespace-nowrap rounded-md px-3 transition-colors duration-150 focus-visible:outline-on-pine ${
                  active ? "bg-on-pine font-semibold text-pine" : "text-on-pine-muted hover:bg-pine-raised hover:text-on-pine"
                }`}
              >
                {r.label}
              </RoleLink>
            );
          })}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-pine-muted">
          {persona ? <span className="hidden md:inline">{persona}</span> : null}
          <span className="rounded-sm border border-dashed border-on-pine-muted px-2 py-1 text-on-pine">Sample data · simulated AI</span>
          <ResetDemoButton />
        </div>
      </div>
    </header>
  );
}
