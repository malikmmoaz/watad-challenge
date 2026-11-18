"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { tour } from "@/content/tour";
import { Icon } from "./ui";

/*
 * Client half of the reviewer guide: only the dismissed state, the hide
 * button and Restart tour. The guide's content is a server component
 * (reviewer-guide.tsx), so it adds almost no JavaScript to the page.
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

/**
 * "open" | "hidden". The server renders "open", which is right for a first
 * visit, so the guide is in the first paint and never pushes the page down
 * (no layout shift for new visitors). A reviewer who dismissed it sees it
 * collapse right after hydration.
 */
function useGuideState(): "open" | "hidden" {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(tour.storageKey) === "1" ? "hidden" : "open";
      } catch {
        return "open";
      }
    },
    () => "open",
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

/** Wraps the server-rendered guide; removes it once dismissed. */
export function GuideShell({ children }: { children: ReactNode }) {
  return useGuideState() === "hidden" ? null : <>{children}</>;
}

export function HideGuideButton() {
  return (
    <button
      type="button"
      data-testid="reviewer-guide-hide"
      onClick={() => setHidden(true)}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-on-pine/25 px-3 text-xs font-medium text-on-pine transition-colors duration-150 hover:bg-on-pine/10 focus-visible:outline-on-pine"
    >
      <Icon name="x" size={12} strokeWidth={2} />
      {tour.dismissLabel}
    </button>
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
