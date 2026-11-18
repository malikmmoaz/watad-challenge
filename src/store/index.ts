"use client";

/**
 * Demo store. The app has no backend: mutable state lives in the browser
 * (localStorage) so a reviewer can act as contractor, supplier and credit
 * manager in one tab and see each role's actions reflected in the others.
 * See docs/adr/0001-stack.md.
 */
import { useSyncExternalStore } from "react";
import { seedState, type DemoState } from "@/data";

const KEY = "watad-demo-state-v1";
const listeners = new Set<() => void>();
let state: DemoState = seedState;
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...seedState, ...(JSON.parse(raw) as Partial<DemoState>) };
  } catch {
    state = seedState;
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    hydrated = false;
    hydrate();
    listeners.forEach((l) => l());
  });
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): DemoState {
  hydrate();
  return state;
}

/** Apply an immutable update. Return the next state; never mutate `prev`. */
export function update(recipe: (prev: DemoState) => DemoState) {
  state = recipe(getState());
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: keep the in-memory state for this tab.
  }
  listeners.forEach((l) => l());
}

/** Restore the seeded sample data. */
export function resetDemo() {
  state = seedState;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

/**
 * Subscribe a client component to a slice of the demo state.
 * Server render and first client render use the seed, so markup matches.
 * The selector must return a stable reference (a slice of state, not a new array);
 * derive with `useMemo` in the component.
 */
export function useDemo<T>(selector: (s: DemoState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(seedState),
  );
}
