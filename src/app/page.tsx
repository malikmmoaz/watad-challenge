import Link from "next/link";
import { ROLES } from "@/components/role-nav";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-16">
      <div className="space-y-4">
        <p className="text-sm font-medium text-neutral-600">Construction materials procurement · Saudi Arabia</p>
        <h1 className="text-4xl font-semibold tracking-tight">From RFQ to offers to purchase order, with credit you can see.</h1>
        <p className="max-w-2xl text-lg text-neutral-700">
          One neutral platform, three roles. Pick a role to explore the full flow. No login is needed, and you can switch at any time.
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {ROLES.map((r) => (
          <li key={r.role}>
            <Link href={r.href} data-testid={`role-${r.role}`} className="flex h-full flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-5 hover:border-neutral-900">
              <span className="text-lg font-semibold">{r.label}</span>
              <span className="text-sm text-neutral-600">Signed in as {r.persona}</span>
              <span className="text-sm text-neutral-700">{r.blurb}</span>
              <span className="mt-auto pt-3 text-sm font-medium">Enter as {r.label.toLowerCase()} →</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-neutral-600">
        All companies, prices and credit files in this demo are sample data. AI features are simulated and labelled where they appear.
      </p>
    </main>
  );
}
