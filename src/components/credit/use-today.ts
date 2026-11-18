"use client";

import { useSyncExternalStore } from "react";
import { SAMPLE_AS_OF } from "@/domain/credit/samples";

const noop = () => () => {};
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Today's date (yyyy-mm-dd) on the client. During prerender and the first
 * render it is the sample data date, so markup matches and Next never
 * evaluates `new Date()` while prerendering.
 */
export function useToday(): string {
  return useSyncExternalStore(noop, today, () => SAMPLE_AS_OF);
}
