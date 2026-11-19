"use client";

import Link from "next/link";
import type { Role } from "@/domain/types";
import { common } from "@/i18n/common";
import { useMessages } from "@/i18n/locale";
import { LocaleToggle } from "./i18n/locale-toggle";
import { ROLES } from "./roles";
import { Icon } from "./ui";
import { ResetDemoButton } from "./reset-demo-button";
import { RestartTour } from "./reviewer-guide-client";
import { RoleLink } from "./role-link";


/**
 * App bar shared by the three role areas, in the same language as the landing
 * nav: product mark, the role switcher as pills, then the explanation pages,
 * the sample-data label and the demo reset. One line from 1024 px (About links from 1280 px); wraps below.
 */
export function RoleNav({ current }: { current: Role }) {
  const m = useMessages(common);
  return (
    <header className="z-20 border-b border-line/70 bg-paper/85 backdrop-blur-md sm:sticky sm:top-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-30 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink">
        {m.skipToContent}
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-md text-base font-semibold tracking-[-0.01em] text-ink">
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-pine-deep text-on-pine shadow-button">
            <Icon name="arrow-right" size={14} strokeWidth={2} className="-rotate-45" />
          </span>
          <span className="sr-only sm:not-sr-only">{m.product}</span>
        </Link>
        <nav aria-label={m.appBar.switchRole} data-testid="role-switcher" className="order-last flex w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 shadow-card text-sm sm:order-none sm:w-auto">
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
                {m.roles[r.role]}
              </RoleLink>
            );
          })}
        </nav>
        <div className="ms-auto flex items-center gap-x-2 text-sm sm:gap-x-4">
          <RestartTour />
          <Link href="/about" data-testid="nav-about" className="hidden text-ink-muted transition-colors duration-150 hover:text-ink xl:inline">
            {m.appBar.about}
          </Link>
          <Link href="/how-we-built" data-testid="nav-how-we-built" className="hidden whitespace-nowrap text-ink-muted transition-colors duration-150 hover:text-ink xl:inline">
            {m.appBar.howWeBuilt}
          </Link>
          <span className="whitespace-nowrap rounded-full border border-dashed border-line-control px-2.5 py-0.5 text-xs text-ink-muted">{m.sampleData}</span>
          <LocaleToggle />
          <ResetDemoButton />
        </div>
      </div>
    </header>
  );
}
