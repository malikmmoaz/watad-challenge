"use client";

import Link from "next/link";
import { common } from "@/i18n/common";
import { useMessages } from "@/i18n/locale";
import { LocaleToggle } from "./i18n/locale-toggle";
import { buttonClass, Icon } from "./ui";

const LINKS = [
  { href: "/about", key: "about" },
  { href: "/how-we-built", key: "howWeBuilt" },
] as const;

/** Pine bar for pages outside the three role areas: product name and the explanation pages. */
export function SiteHeader({ current }: { current?: (typeof LINKS)[number]["href"] }) {
  const m = useMessages(common);
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-10 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink">
        {m.skipToContent}
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-md text-base font-semibold tracking-[-0.01em] text-ink">
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-pine-deep text-on-pine shadow-button">
            <Icon name="arrow-right" size={14} strokeWidth={2} className="-rotate-45" />
          </span>
          {m.product}
        </Link>
        <nav aria-label={m.appBar.aboutNav} data-testid="site-nav" className="flex gap-1 rounded-full border border-line bg-surface p-1 text-sm shadow-card">
          {LINKS.map((l) => {
            const active = l.href === current;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-8 items-center whitespace-nowrap rounded-full px-3.5 font-medium transition-colors duration-150 ${
                  active ? "bg-pine-deep text-on-pine shadow-button" : "text-ink-muted hover:bg-paper hover:text-ink"
                }`}
              >
                {m.appBar[l.key]}
              </Link>
            );
          })}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <LocaleToggle />
          <Link href="/" className={buttonClass("primary", "sm", "rounded-full px-4")}>
            {m.appBar.chooseRole}
          </Link>
        </div>
      </div>
    </header>
  );
}
