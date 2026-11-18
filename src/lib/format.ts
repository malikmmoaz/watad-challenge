import type { IsoDate } from "@/domain/types";

const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Riyadh" });

/** "2 Dec 2026". Fixed locale so server and client render the same string. */
export const formatDate = (iso: IsoDate): string => date.format(new Date(iso));

/** "18 Nov 2026, 14:20", Riyadh time. */
export const formatDateTime = (iso: IsoDate): string => dateTime.format(new Date(iso));

/** 0.96 -> "96%". */
export const formatPercent = (fraction: number, digits = 0): string => `${(fraction * 100).toFixed(digits)}%`;
