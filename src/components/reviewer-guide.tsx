import Link from "next/link";
import { tour } from "@/content/tour";
import { tourAr } from "@/content/tour-ar";
import { T } from "@/components/i18n/t";
import type { Role } from "@/domain/types";
import { GuideShell, GuideText, HideGuideButton } from "./reviewer-guide-client";
import { Icon } from "./ui";

/*
 * Reviewer guide (#16): one panel per role with three steps, copy in
 * src/content/tour.ts (English) and tour-ar.ts (Arabic). A server component, so its content ships as HTML, not
 * JavaScript; the dismissed state lives in reviewer-guide-client.tsx. It sits
 * inline under the app bar, never floating over a page, so it cannot cover a
 * primary action, and it is in the first paint, so it causes no layout shift.
 */


export function ReviewerGuide({ role }: { role: Role }) {
  const panel = tour.panels[role];
  const ar = tourAr.panels[role];

  return (
    <GuideShell>
    <section
      aria-labelledby="reviewer-guide-h"
      data-testid="reviewer-guide"
      className="relative isolate overflow-hidden border-b border-pine-raised bg-pine-deep text-on-pine print:hidden"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 start-1/3 -z-10 h-56 w-[40rem] rounded-full bg-glow/15 blur-3xl" />
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <h2 id="reviewer-guide-h" className="text-base font-semibold text-on-pine">
              <T m={{ en: panel.title, ar: ar.title }} />
            </h2>
            <p className="mt-0.5 hidden text-sm text-on-pine-muted sm:block">
              <T m={{ en: panel.intro, ar: ar.intro }} />
            </p>
          </div>
          <HideGuideButton />
        </div>

        {/* On phones the steps scroll sideways: the scroller is a focusable, labelled region so
            keyboard users can scroll it too (axe scrollable-region-focusable), as in ui/table.tsx. */}
        <div
          role="region"
          aria-labelledby="reviewer-guide-h"
          tabIndex={0}
          className="-mx-4 mt-4 snap-x snap-mandatory overflow-x-auto rounded-sm px-4 pb-1 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow md:mx-0 md:overflow-visible md:px-0 md:pb-0"
        >
        <ol className="flex gap-3 md:grid md:grid-cols-3">
          {panel.steps.map((step, i) => (
            <li key={step.title} className="flex w-[82%] shrink-0 snap-start flex-col gap-2 rounded-xl border border-on-pine/10 bg-pine/60 p-4 md:w-auto">
              <p className="flex items-center gap-2.5 text-sm font-semibold text-on-pine">
                <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-glow text-xs font-bold text-pine-deep">
                  {i + 1}
                </span>
                <T m={{ en: step.title, ar: ar.steps[i]!.title }} />
              </p>
              <p className="text-sm leading-6 text-on-pine-muted">
                <GuideText en={step.text} ar={ar.steps[i]!.text} />
              </p>
              {step.href && step.linkLabel ? (
                <Link href={step.href} className="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-medium text-glow underline decoration-glow/40 underline-offset-[3px] hover:decoration-glow focus-visible:outline-on-pine">
                  <T m={{ en: `Open ${step.linkLabel}`, ar: `افتح ${ar.steps[i]!.linkLabel ?? step.linkLabel}` }} />
                  <Icon name="arrow-right" size={14} />
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-on-pine-muted">
          <p className="hidden max-w-3xl md:block">
            <GuideText en={tour.footer} ar={tourAr.footer} />
          </p>
          <Link href={panel.next.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-on-pine underline decoration-on-pine/40 underline-offset-[3px] hover:decoration-on-pine focus-visible:outline-on-pine">
            <T m={{ en: panel.next.label, ar: ar.next.label }} />
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </div>
    </section>
    </GuideShell>
  );
}
