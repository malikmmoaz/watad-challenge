import Link from "next/link";
import { ROLES } from "@/components/role-nav";
import { Icon } from "@/components/ui";

export default function Home() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-14 sm:px-8 sm:py-20">
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-ink-muted">Construction materials procurement · Saudi Arabia</p>
        <h1 className="max-w-3xl text-3xl font-semibold text-ink sm:text-4xl">From RFQ to offers to purchase order, with credit you can see.</h1>
        <p className="max-w-2xl text-lg text-ink-muted">
          One neutral platform, three roles. Pick a role to explore the full flow. No login is needed, and you can switch at any time.
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {ROLES.map((r) => (
          <li key={r.role}>
            <Link
              href={r.href}
              data-testid={`role-${r.role}`}
              className="group flex h-full flex-col gap-2 rounded-lg border border-line-strong bg-surface p-5 transition-colors duration-150 hover:border-action"
            >
              <span className="text-lg font-semibold text-ink">{r.label}</span>
              <span className="text-xs text-ink-muted">Signed in as {r.persona}</span>
              <span className="mt-1 text-sm text-ink">{r.blurb}</span>
              <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold text-action group-hover:text-action-hover">
                Enter as {r.label.toLowerCase()}
                <Icon name="arrow-right" className="transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="max-w-2xl border-t border-line pt-5 text-sm text-ink-muted">
        All companies, prices and credit files in this demo are sample data. AI features are simulated and labelled where they appear.
      </p>
    </main>
  );
}
