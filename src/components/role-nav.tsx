import Link from "next/link";
import type { Role } from "@/domain/types";
import { ResetDemoButton } from "./reset-demo-button";

export const ROLES: { role: Role; href: string; label: string; persona: string; blurb: string }[] = [
  { role: "contractor", href: "/contractor", label: "Contractor", persona: "Najd Horizon Contracting Co.", blurb: "Upload an RFQ or order from the catalog, compare offers, place a PO and apply for a credit cap." },
  { role: "supplier", href: "/supplier", label: "Supplier", persona: "Rawasi Building Materials Trading", blurb: "See matched requests, submit offers with price, stock, lead time and terms, and track awards." },
  { role: "credit", href: "/credit", label: "Credit manager", persona: "Independent credit manager", blurb: "Review documents, gated checks and the scorecard with AI assist, then approve, decline or request more information." },
];

/** Top bar shared by the three role areas. Layla's design system restyles this in #6. */
export function RoleNav({ current }: { current: Role }) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold">
          Watad challenge demo
        </Link>
        <nav aria-label="Switch role" className="flex gap-1 text-sm">
          {ROLES.map((r) => (
            <Link
              key={r.role}
              href={r.href}
              aria-current={r.role === current ? "page" : undefined}
              className={`rounded px-3 py-1.5 ${r.role === current ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs text-neutral-600">
          <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-900">Sample data · simulated AI</span>
          <ResetDemoButton />
        </div>
      </div>
    </header>
  );
}
