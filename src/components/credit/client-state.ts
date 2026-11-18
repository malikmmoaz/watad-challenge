"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * False during prerender and the first client render, true once the browser
 * has taken over and the demo store has read localStorage. Lets credit screens
 * show a designed loading state instead of flashing the seed data.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

const onHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

/** The URL fragment without '#', e.g. "cc_515" after an application is submitted. */
export function useHash(): string {
  return useSyncExternalStore(onHash, () => window.location.hash.slice(1), () => "");
}

const onMotion = (cb: () => void) => {
  const m = window.matchMedia("(prefers-reduced-motion: reduce)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** True when the user asked for reduced motion; animations then show the end state at once. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(onMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
}
