"use client";

import { useState } from "react";
import { provideMoreInfo, trackerSteps } from "@/domain/credit-application";
import { capChange, outcomeTerms, type OutcomeTerms } from "@/domain/credit/workflow";
import { CREDIT_CASE_STATUS } from "@/lib/status";
import type { CreditCase, CreditFacility, GateResult, ReasonCode } from "@/domain/types";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useMessages } from "@/i18n/locale";
import { track } from "@/lib/analytics";
import { update, useDemo } from "@/store";
import { Alert, Badge, Button, DecisionStamp, Panel, StatusTimeline, Textarea, type TimelineStep, type Tone } from "@/components/ui";
import { logAction, logDetail } from "./log-text";
import { personName, purposeText, seedText } from "./data-text";

const GATE_TONE: Record<GateResult, Tone> = { pass: "positive", flag: "caution", fail: "negative", pending: "neutral" };

export function StatusBadge({ status }: { status: CreditCase["status"] }) {
  const m = useMessages(credit);
  return (
    <span data-testid="credit-tracker-status" data-status={status}>
      <Badge tone={CREDIT_CASE_STATUS[status].tone}>{m.caseStatus[status]}</Badge>
    </span>
  );
}

/** Contractor view of one application: progress, checks, outcome and reasons. */
export function ApplicationTracker({ c, readOnly = false }: { c: CreditCase; facility?: CreditFacility; readOnly?: boolean }) {
  const all = useMessages(credit);
  const m = all.tracker;
  const f = useFormat();
  const steps: TimelineStep[] = trackerSteps(c).map((s) => ({
    label: m.steps[s.key].label,
    state: s.key === "more_info" && s.state === "current" ? "problem" : s.state,
    note: s.state === "skipped" ? m.notNeeded : s.state === "current" ? m.steps[s.key].description : undefined,
  }));
  return (
    <div data-testid={`credit-case-${c.id}`}>
      <Panel
        title={fill(m.application, { n: c.id.replace("cc_", "#"), cap: f.money(c.requestedCap), days: c.requestedTenorDays })}
        aside={<StatusBadge status={c.status} />}
      >
        <div className="space-y-6">
          <p className="text-sm text-ink-muted">{fill(m.submittedOn, { purpose: purposeText(c.purpose, credit.en as never, all), date: c.submittedAt ? f.date(c.submittedAt) : "" })}</p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <StatusTimeline label={m.progress} steps={steps} />
            <div className="space-y-5">
              <section aria-label={m.checksTitle} className="space-y-2">
                <h3 className="text-sm font-medium text-ink">{m.checksTitle}</h3>
                <ul className="space-y-1.5">
                  {[...c.gates]
                    .sort((a, b) => a.order - b.order)
                    .map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-3 text-sm">
                        <span>
                          {g.order}. {all.checks.label[g.id]}
                        </span>
                        <Badge tone={GATE_TONE[g.result]}>{m.gate[g.result]}</Badge>
                      </li>
                    ))}
                </ul>
              </section>
              <Outcome c={c} readOnly={readOnly} />
            </div>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-ink">{fill(m.activity, { n: c.log.length })}</summary>
            <ul className="mt-2 space-y-1 text-ink-muted">
              {c.log.map((l, i) => (
                <li key={i}>
                  <span className="text-xs tabular-nums">{f.dateTime(l.at)}</span> · {logAction(l.action, all)}
                  {l.detail ? ` · ${logDetail(l.detail, all)}` : ""}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </Panel>
    </div>
  );
}

function Outcome({ c, readOnly }: { c: CreditCase; readOnly: boolean }) {
  const all = useMessages(credit);
  const m = all.tracker;
  const f = useFormat();
  const d = c.decision;
  if (c.status === "more_info_requested") {
    return readOnly ? <Alert tone="caution" title={m.waitingContractor} /> : <MoreInfoForm c={c} />;
  }
  const lastEntry = c.log.at(-1);
  if (c.status === "documents_review" && lastEntry?.action === "More information provided") {
    return (
      <div data-testid="credit-more-info-sent">
        <Alert tone="positive" title={m.sentTitle}>
          {lastEntry.detail ? `${lastEntry.detail}. ` : ""}
          {m.sentBody}
        </Alert>
      </div>
    );
  }
  if (!d || (c.status !== "approved" && c.status !== "declined")) {
    const next = (m.next as Record<string, string>)[c.status];
    return (
      <p className="text-sm text-ink-muted" data-testid="credit-next">
        {next ?? m.noDecision}
      </p>
    );
  }
  const approved = d.outcome === "approve";
  return (
    <section data-testid="credit-outcome" className="space-y-3">
      {/* The stamp is tilted on purpose; clip its corners rather than scroll sideways on phones. */}
      <div className="overflow-x-clip py-1">
        <DecisionStamp decision={d.outcome} by={personName(d.decidedBy, credit.en as never, all)} at={f.date(d.decidedAt)} />
      </div>
      {approved && d.approvedCap !== undefined && <CapLine c={c} approved={d.approvedCap} />}
      {approved && <ForYou c={c} />}
      <Reasons codes={d.reasonCodes} />
      <div className="text-sm">
        <p className="font-medium text-ink">{m.forYou.note}</p>
        <p className="text-ink">{seedText(d.reasonText, credit.en as never, all)}</p>
      </div>
      {d.conditions && d.conditions.length > 0 && (
        <div className="text-sm">
          <p className="font-medium text-ink">{m.conditions}</p>
          <ul className="list-disc ps-5 text-ink-muted">
            {d.conditions.map((x) => (
              <li key={x}>{seedText(x, credit.en as never, all)}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function MoreInfoForm({ c }: { c: CreditCase }) {
  const all = useMessages(credit);
  const m = all.tracker;
  const [files, setFiles] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const items = c.decision?.requestedItems ?? [];
  const send = () => {
    try {
      const next = provideMoreInfo(c, files, note, new Date().toISOString());
      track("credit_info_provided", { case_id: c.id, file_count: files.length, has_note: note.trim().length > 0 });
      update((s) => ({ ...s, creditCases: s.creditCases.map((x) => (x.id === c.id ? next : x)) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <div data-testid="credit-more-info" className="space-y-3">
      <Alert tone="caution" title={m.needsInfo}>
        {c.decision?.reasonText}
        {items.length > 0 && (
          <ul className="mt-1 list-disc ps-5">
            {items.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
      </Alert>
      <label className="block text-sm font-medium text-ink">
        {m.attachFiles}
        <input type="file" multiple className="mt-1 block text-sm font-normal" onChange={(e) => setFiles(Array.from(e.target.files ?? []).map((x) => x.name))} />
      </label>
      <Textarea dir="auto" label={m.noteLabel} optional rows={2} value={note} onChange={(e) => setNote(e.target.value)} error={error ?? undefined} />
      <Button variant="primary" onClick={send} data-testid="credit-more-info-send">
        {m.send}
      </Button>
      <p className="text-xs text-ink-muted">{all.apply.filesStay}</p>
    </div>
  );
}

/** The approved cap, only when "What this means for you" has no terms to show (a decision without a cap change in its log). */
function CapLine({ c, approved }: { c: CreditCase; approved: NonNullable<NonNullable<CreditCase["decision"]>["approvedCap"]> }) {
  const m = useMessages(credit).tracker;
  const f = useFormat();
  if (capChange(c)) return null;
  return (
    <p className="text-sm font-medium text-ink" data-testid="credit-cap-change">
      {fill(m.capApproved, { cap: f.money(approved) })}
    </p>
  );
}

const POSITIVE = new Set<ReasonCode>(["strong_liquidity", "clean_payment_history", "quality_payers"]);

/** The structured reasons behind the decision, in plain words: what counted for the contractor and what held it back. */
function Reasons({ codes }: { codes: ReasonCode[] }) {
  const m = useMessages(credit).tracker;
  const pos = codes.filter((x) => POSITIVE.has(x));
  const neg = codes.filter((x) => !POSITIVE.has(x));
  if (codes.length === 0) return null;
  const list = (title: string, xs: ReasonCode[], tone: string, kind: string) =>
    xs.length > 0 && (
      <div data-testid={`credit-reasons-${kind}`}>
        <p className="font-medium text-ink">{title}</p>
        <ul className="mt-1 space-y-0.5">
          {xs.map((x) => (
            <li key={x} className="flex gap-2">
              <span aria-hidden="true" className={tone}>
                {kind === "for" ? "+" : "−"}
              </span>
              <span className="text-ink">{m.reason[x]}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      {list(m.forYou.strengths, pos, "text-positive", "for")}
      {list(m.forYou.concerns, neg, "text-caution", "against")}
    </div>
  );
}

/** What the approval changes for the contractor: cap, band and Murabaha markup, before and after. */
function ForYou({ c }: { c: CreditCase }) {
  const m = useMessages(credit).tracker;
  const f = useFormat();
  const cases = useDemo((s) => s.creditCases);
  const t = outcomeTerms(c, cases);
  if (!t) return null;
  const { before, after } = t;
  const rate = (x: OutcomeTerms) => fill(m.forYou.rateValue, { rate: f.percent(x.profitRate, 2), apr: f.percent(x.apr, 1) });
  const rows = [
    { key: "cap", label: m.forYou.cap, was: before && f.money(before.cap), now: f.money(after.cap) },
    { key: "band", label: m.forYou.band, was: before?.band, now: after.band },
    { key: "rate", label: fill(m.forYou.rate, { days: after.tenorDays }), was: before && rate(before), now: rate(after) },
  ];
  return (
    <section className="rounded-xl bg-paper p-4" data-testid="credit-for-you">
      <h4 className="mb-2 text-sm font-semibold text-ink">{m.forYou.title}</h4>
      <dl className="space-y-1.5 text-sm">
        {rows.map((r) => {
          const changed = r.was !== undefined && r.was !== null && r.was !== r.now;
          return (
            <div key={r.key} className="flex flex-wrap items-baseline justify-between gap-x-3" data-testid={`credit-for-you-${r.key}`} data-changed={changed || undefined}>
              <dt className="text-ink-muted">{r.label}</dt>
              <dd className="text-end tabular-nums">
                {/* Amounts stay whole on narrow screens; the longer rate line may wrap. */}
                <span className={`font-semibold ${r.key === "rate" ? "" : "whitespace-nowrap "}${changed ? "text-positive" : "text-ink"}`}>{r.now}</span>
                {changed && <span className={`block text-xs text-ink-muted ${r.key === "rate" ? "" : "whitespace-nowrap"}`}>{fill(m.forYou.was, { value: r.was! })}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
      {c.decision && <p className="mt-2 text-xs text-ink-muted">{fill(m.forYou.from, { date: f.date(c.decision.decidedAt) })}</p>}
    </section>
  );
}
