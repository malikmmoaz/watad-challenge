import Link from "next/link";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/how-we-built", label: "How we built it" },
] as const;

/** Pine bar for pages outside the three role areas: product name and the explanation pages. */
export function SiteHeader({ current }: { current?: (typeof LINKS)[number]["href"] }) {
  return (
    <header className="bg-pine text-on-pine">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-8">
        <Link href="/" className="rounded-sm text-base font-semibold text-on-pine focus-visible:outline-on-pine">
          Watad challenge demo
        </Link>
        <nav aria-label="About this demo" data-testid="site-nav" className="flex gap-1 text-sm">
          {LINKS.map((l) => {
            const active = l.href === current;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-8 items-center whitespace-nowrap rounded-md px-3 transition-colors duration-150 focus-visible:outline-on-pine ${
                  active ? "bg-on-pine font-semibold text-pine" : "text-on-pine-muted hover:bg-pine-raised hover:text-on-pine"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/"
          className="ml-auto flex h-8 items-center rounded-md border border-on-pine-muted/60 px-3 text-sm text-on-pine transition-colors duration-150 hover:bg-pine-raised focus-visible:outline-on-pine"
        >
          Choose a role
        </Link>
      </div>
    </header>
  );
}
