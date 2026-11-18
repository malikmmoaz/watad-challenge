"use client";

import Link from "next/link";
import { Fragment, useSyncExternalStore, type ReactNode } from "react";
import { tour } from "@/content/tour";
import type { Role } from "@/domain/types";
import { Icon } from "./ui";

/*
 * Reviewer guide (#16): one panel per role with three steps, copy in
 * src/content/tour.ts. It sits inline under the app bar, never floating over a
 * page, so it cannot cover a primary action. "Hide guide" stores the dismissal;
 * "Restart tour" in the app bar clears it.
 */

const EVENT = "watad-tour-change";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** "open" | "hidden" in the browser; "unknown" on the server and before hydration. */
function useGuideState(): "open" | "hidden" | "unknown" {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(tour.storageKey) === "1" ? "hidden" : "open";
      } catch {
        return "open";
      }
    },
    () => "unknown",
  );
}

function setHidden(hidden: boolean) {
  try {
    if (hidden) window.localStorage.setItem(tour.storageKey, "1");
    else window.localStorage.removeItem(tour.storageKey);
  } catch {
    // Storage blocked: the guide simply stays open this visit.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** `**Label**` becomes the button-label style; everything else stays plain text. */
function withLabels(text: string): ReactNode {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="whitespace-nowrap rounded-md border border-on-pine/20 bg-on-pine/10 px-1.5 py-px font-medium text-on-pine">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function ReviewerGuide({ role }: { role: Role }) {
  const state = useGuideState();
  const panel = tour.panels[role];
  if (state !== "open") return null;

  return (
    <section
      aria-labelledby="reviewer-guide-h"
      data-testid="reviewer-guide"
      className="relative isolate overflow-hidden border-b border-pine-raised bg-pine-deep text-on-pine motion-safe:animate-fade"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/3 -z-10 h-56 w-[40rem] rounded-full bg-glow/15 blur-3xl" />
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <h2 id="reviewer-guide-h" className="text-base font-semibold tracking-[-0.01em] text-on-pine">
              {panel.title}
            </h2>
            <p className="mt-0.5 text-sm text-on-pine-muted">{panel.intro}</p>
          </div>
          <button
            type="button"
            data-testid="reviewer-guide-hide"
            onClick={() => setHidden(true)}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-on-pine/25 px-3 text-xs font-medium text-on-pine transition-colors duration-150 hover:bg-on-pine/10 focus-visible:outline-on-pine"
          >
            <Icon name="x" size={12} strokeWidth={2} />
            {tour.dismissLabel}
          </button>
        </div>

        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {panel.steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-xl border border-on-pine/10 bg-pine/60 p-4">
              <p className="flex items-center gap-2.5 text-sm font-semibold text-on-pine">
                <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-glow text-xs font-bold text-pine-deep">
                  {i + 1}
                </span>
                {step.title}
              </p>
              <p className="text-sm leading-6 text-on-pine-muted">{withLabels(step.text)}</p>
              {step.href && step.linkLabel ? (
                <Link href={step.href} className="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-medium text-glow underline decoration-glow/40 underline-offset-[3px] hover:decoration-glow focus-visible:outline-on-pine">
                  Open {step.linkLabel}
                  <Icon name="arrow-right" size={14} />
                </Link>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-on-pine-muted">
          <p className="max-w-3xl">{withLabels(tour.footer)}</p>
          <Link href={panel.next.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-on-pine underline decoration-on-pine/40 underline-offset-[3px] hover:decoration-on-pine focus-visible:outline-on-pine">
            {panel.next.label}
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** App-bar link that reopens the guide; shown only while the guide is hidden. */
export function RestartTour() {
  const state = useGuideState();
  if (state !== "hidden") return null;
  return (
    <button
      type="button"
      data-testid="reviewer-guide-restart"
      aria-label={tour.restartLabel}
      onClick={() => {
        setHidden(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="whitespace-nowrap text-sm text-ink-muted transition-colors duration-150 hover:text-ink"
    >
      <span className="sm:hidden">Guide</span>
      <span className="hidden sm:inline">{tour.restartLabel}</span>
    </button>
  );
}
