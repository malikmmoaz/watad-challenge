"use client";

/**
 * Bell in the app bar: what changed for the current role, from the state the three roles share.
 * A disclosure, not a modal (on phones the panel hangs from the full-width app bar, so it never
 * runs off the screen edge in either direction): the button toggles a panel of links; Escape or a click outside
 * closes it and focus returns to the bell. "Mark all as read" stores a read time per role in
 * this browser, so switching roles shows each role its own unread count.
 */
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { demoPersona, reference, seedState } from "@/data";
import type { IsoDate, Role } from "@/domain/types";
import { activity } from "@/i18n/activity";
import { useMessages } from "@/i18n/locale";
import { activityFor, defaultSeenAt, unreadCount, type ActivityItem } from "@/lib/activity/feed";
import { useProcurementI18n } from "@/components/procurement/use-procurement-i18n";
import { useDemo } from "@/store";
import { Icon } from "../ui";

const SEEN_KEY = "watad-activity-seen-v1";
const MAX_ITEMS = 12;

type Seen = Partial<Record<Role, IsoDate>>;
const seenListeners = new Set<() => void>();
let seenCache: Seen | null = null;

function readSeen(): Seen {
  if (seenCache) return seenCache;
  try {
    seenCache = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "{}") as Seen;
  } catch {
    seenCache = {};
  }
  return seenCache;
}

function subscribeSeen(listener: () => void) {
  seenListeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SEEN_KEY) return;
    seenCache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    seenListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function markRead(role: Role, at: IsoDate) {
  seenCache = { ...readSeen(), [role]: at };
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(seenCache));
  } catch {
    // Storage blocked: the read mark lasts for this tab only.
  }
  seenListeners.forEach((l) => l());
}

const EMPTY: Seen = {};

export function ActivityBell({ role }: { role: Role }) {
  const a = useMessages(activity);
  const i = useProcurementI18n();
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const purchaseOrders = useDemo((s) => s.purchaseOrders);
  const creditCases = useDemo((s) => s.creditCases);
  const creditFacilities = useDemo((s) => s.creditFacilities);
  const items = useMemo(
    () => activityFor(role, { rfqs, offers, purchaseOrders, creditCases, creditFacilities }, demoPersona),
    [role, rfqs, offers, purchaseOrders, creditCases, creditFacilities],
  );
  // A role that never marked the feed read starts one day before the newest seed item.
  const firstVisit = useMemo(() => defaultSeenAt(activityFor(role, seedState, demoPersona)), [role]);
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => EMPTY);
  const seenAt = seen[role] ?? firstVisit;
  const unread = unreadCount(items, seenAt);

  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const text = (item: ActivityItem): string => {
    const rfq = item.rfqId ? rfqs.find((r) => r.id === item.rfqId) : undefined;
    const supplier = reference.suppliers.find((s) => s.id === item.supplierId);
    const contractor = reference.contractors.find((c) => c.id === item.contractorId);
    const values = {
      rfq: rfq ? i.rfqTitle(rfq) : (item.rfqId ?? ""),
      po: item.poId ? i.fill(a.poLabel, { n: item.poId.replace(/^po_/, "") }) : "",
      supplier: i.name(supplier, a.aSupplier),
      contractor: i.name(contractor, item.contractorId ?? ""),
      amount: item.amount === undefined ? "" : i.f.money(item.amount as never),
    };
    if (item.kind === "creditDecision") {
      const key = item.outcome === "approve" ? "creditApprove" : item.outcome === "decline" ? "creditDecline" : "creditRequestInfo";
      return i.fill(a.items[key], values);
    }
    return i.fill(a.items[item.kind], values);
  };

  const shown = items.slice(0, MAX_ITEMS);
  return (
    <div ref={root} className="sm:relative">
      <button
        ref={button}
        type="button"
        data-testid="activity-bell"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread ? i.fill(a.bellUnread, { n: unread }) : a.bell}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-8 place-items-center rounded-full border border-line-control bg-surface text-ink shadow-card transition-colors duration-150 hover:bg-paper"
      >
        <Icon name="bell" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            data-testid="activity-count"
            className="absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-pine-deep px-1 text-[0.625rem] font-semibold leading-none text-on-pine tabular-nums"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <section
          id={panelId}
          aria-labelledby={titleId}
          data-testid="activity-panel"
          className="absolute inset-x-4 top-full z-30 mt-2 flex max-h-[min(32rem,75vh)] flex-col sm:inset-x-auto sm:end-0 sm:w-[24rem] overflow-hidden rounded-xl border border-line bg-surface text-start shadow-float motion-safe:animate-rise"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 id={titleId} className="text-sm font-semibold text-ink">
                {a.title}
              </h2>
              <p className="text-xs text-ink-muted">{a.intro}</p>
            </div>
            <button
              type="button"
              data-testid="activity-mark-read"
              disabled={unread === 0}
              onClick={() => {
                const now = new Date().toISOString();
                markRead(role, items[0] && items[0].at > now ? items[0].at : now);
              }}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink disabled:no-underline disabled:text-ink-muted"
            >
              {unread === 0 ? a.allRead : a.markAllRead}
            </button>
          </div>
          {shown.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-muted">{a.empty}</p>
          ) : (
            <ul className="overflow-y-auto">
              {shown.map((item) => {
                const isNew = !seenAt || item.at > seenAt;
                return (
                  <li key={item.id} className="border-b border-line last:border-b-0">
                    <Link
                      href={item.href}
                      data-testid="activity-item"
                      data-unread={isNew ? "true" : undefined}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-2.5 text-sm leading-5 transition-colors duration-150 hover:bg-paper focus-visible:bg-paper"
                    >
                      <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${isNew ? "bg-stamp" : "bg-transparent"}`} />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-ink">
                          {isNew ? <span className="sr-only">{a.newBadge}: </span> : null}
                          {text(item)}
                        </span>
                        <span className="text-xs text-ink-muted tabular-nums">
                          <bdi>{i.f.dateTime(item.at)}</bdi>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
