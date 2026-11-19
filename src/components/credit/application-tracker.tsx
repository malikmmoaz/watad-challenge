"use client";

import { useState } from "react";
import { provideMoreInfo, trackerSteps } from "@/domain/credit-application";
import { CREDIT_CASE_STATUS } from "@/lib/status";
import { murabaha } from "@/domain/money";
import type { CreditCase, CreditFacility, GateResult } from "@/domain/types";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useMessages } from "@/i18n/locale";
import { track } from "@/lib/analytics";
import { update } from "@/store";
import { Alert, Badge, Button, DecisionStamp, Panel, StatusTimeline, Textarea, type TimelineStep, type Tone } from "@/components/ui";
import { logAction, logDetail } from "./log-text";

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
export function ApplicationTracker({ c, facility, readOnly = false }: { c: CreditCase; facility?: CreditFacility; readOnly?: boolean }) {
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
          <p className="text-sm text-ink-muted">{fill(m.submittedOn, { purpose: c.purpose, date: c.submittedAt ? f.date(c.submittedAt) : "" })}</p>
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
              <Outcome c={c} facility={facility} readOnly={readOnly} />
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

function Outcome({ c, facility, readOnly }: { c: CreditCase; facility?: CreditFacility; readOnly: boolean }) {
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
    return <p className="text-sm text-ink-muted">{m.noDecision}</p>;
  }
  const approved = d.outcome === "approve";
  return (
    <section data-testid="credit-outcome" className="space-y-3">
      {/* The stamp is tilted on purpose; clip its corners rather than scroll sideways on phones. */}
      <div className="overflow-x-clip py-1">
        <DecisionStamp decision={d.outcome} by={d.decidedBy} at={f.date(d.decidedAt)} />
      </div>
      {approved && d.approvedCap !== undefined && <p className="text-sm font-medium text-ink">{fill(m.capApproved, { cap: f.money(d.approvedCap) })}</p>}
      <p className="text-sm text-ink">{d.reasonText}</p>
      {d.conditions && d.conditions.length > 0 && (
        <div className="text-sm">
          <p className="font-medium text-ink">{m.conditions}</p>
          <ul className="list-disc ps-5 text-ink-muted">
            {d.conditions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      {approved && facility && (
        <p className="text-sm text-ink-muted">
          {fill(m.facilityTerms, {
            days: facility.maxTenorDays,
            rate: f.percent(facility.profitRate, 2),
            apr: f.percent(murabaha(facility.cap, facility.profitRate, facility.maxTenorDays).apr, 1),
          })}
        </p>
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
      <Textarea label={m.noteLabel} optional rows={2} value={note} onChange={(e) => setNote(e.target.value)} error={error ?? undefined} />
      <Button variant="primary" onClick={send} data-testid="credit-more-info-send">
        {m.send}
      </Button>
      <p className="text-xs text-ink-muted">{all.apply.filesStay}</p>
    </div>
  );
}
