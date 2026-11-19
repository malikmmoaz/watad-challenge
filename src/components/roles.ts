/**
 * The three roles: routes and the English copy the landing page uses today.
 * Translated labels, personas and blurbs live in `common` (src/i18n/common.ts);
 * render them with `useMessages(common)` or `<T m={msg(common, (m) => m.roles[role])} />`.
 */
import type { Role } from "@/domain/types";

export const ROLES: { role: Role; href: string; label: string; persona: string; blurb: string }[] = [
  { role: "contractor", href: "/contractor", label: "Contractor", persona: "Najd Horizon Contracting Co.", blurb: "Upload an RFQ or order from the catalog, compare offers, place a PO and apply for a credit cap." },
  { role: "supplier", href: "/supplier", label: "Supplier", persona: "Rawasi Building Materials Trading", blurb: "See matched requests, submit offers with price, stock, lead time and terms, and track awards." },
  { role: "credit", href: "/credit", label: "Credit manager", persona: "Independent credit manager", blurb: "Review documents, gated checks and the scorecard with AI assist, then approve, decline or request more information." },
];
