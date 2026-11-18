"use client";

import { useState } from "react";
import { provideMoreInfo, trackerSteps } from "@/domain/credit-application";
import { formatDate, formatDateTime } from "@/lib/format";
import { CREDIT_CASE_STATUS } from "@/lib/status";
import { formatSar, murabaha } from "@/domain/money";
import type { CreditCase, CreditFacility, GateResult } from "@/domain/types";
import { track } from "@/lib/analytics";
import { update } from "@/store";
import { Alert, Badge, Button, DecisionStamp, Panel, StatusTimeline, Textarea, type TimelineStep, type Tone } from "@/components/ui";

const GATE: Record<GateResult, { text: string; tone: Tone }> = {
  pass: { text: "Checked", tone: "positive" },
  flag: { text: "Checked, noted for review", tone: "caution" },
  fail: { text: "Needs attention", tone: "negative" },
  pending: { text: "Queued", tone: "neutral" },
};

const date = (iso?: string) => (iso ? formatDate(iso) : "");

export function StatusBadge({ status }: { status: CreditCase["status"] }) {
  return (
    <span data-testid="credit-tracker-status" data-status={status}>
      <Badge tone={CREDIT_CASE_STATUS[status].tone}>{CREDIT_CASE_STATUS[status].label}</Badge>
    </span>
  );
}

/** Contractor view of one application: progress, checks, outcome and reasons. */
export function ApplicationTracker({ c, facility, readOnly = false }: { c: CreditCase; facility?: CreditFacility; readOnly?: boolean }) {
  const steps: TimelineStep[] = trackerSteps(c).map((s) => ({
    label: s.label,
    state: s.key === "more_info" && s.state === "current" ? "problem" : s.state,
    note: s.state === "skipped" ? "Not needed" : s.state === "current" ? s.description : undefined,
  }));
  return (
    <div data-testid={`credit-case-${c.id}`}>
      <Panel
        title={`Application ${c.id.replace("cc_", "#")} · ${formatSar(c.requestedCap)} for ${c.requestedTenorDays} days`}
        aside={<StatusBadge status={c.status} />}
      >
        <div className="space-y-6">
          <p className="text-sm text-ink-muted">
            {c.purpose} · submitted {date(c.submittedAt)}
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <StatusTimeline label="Application progress" steps={steps} />
            <div className="space-y-5">
              <section aria-label="Checks" className="space-y-2">
                <h3 className="text-sm font-medium text-ink">Checks, cheapest first; SIMAH last</h3>
                <ul className="space-y-1.5">
                  {[...c.gates]
                    .sort((a, b) => a.order - b.order)
                    .map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-3 text-sm">
                        <span>
                          {g.order}. {g.label}
                        </span>
                        <Badge tone={GATE[g.result].tone}>{GATE[g.result].text}</Badge>
                      </li>
                    ))}
                </ul>
              </section>
              <Outcome c={c} facility={facility} readOnly={readOnly} />
            </div>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-ink">Activity ({c.log.length})</summary>
            <ul className="mt-2 space-y-1 text-ink-muted">
              {c.log.map((l, i) => (
                <li key={i}>
                  <span className="text-xs tabular-nums">{formatDateTime(l.at)}</span> · {l.action}
                  {l.detail ? ` · ${l.detail}` : ""}
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
  const d = c.decision;
  if (c.status === "more_info_requested") {
    return readOnly ? <Alert tone="caution" title="Waiting for the contractor to provide more information" /> : <MoreInfoForm c={c} />;
  }
  const lastEntry = c.log.at(-1);
  if (c.status === "documents_review" && lastEntry?.action === "More information provided") {
    return (
      <div data-testid="credit-more-info-sent">
        <Alert tone="positive" title="Sent to the credit manager">
          {lastEntry.detail ? `${lastEntry.detail}. ` : ""}The checks run again with what you sent; the outcome appears here.
        </Alert>
      </div>
    );
  }
  if (!d || (c.status !== "approved" && c.status !== "declined")) {
    return <p className="text-sm text-ink-muted">No decision yet. An independent credit manager decides; the simulated AI only prepares the file.</p>;
  }
  const approved = d.outcome === "approve";
  return (
    <section data-testid="credit-outcome" className="space-y-3">
      {/* The stamp is tilted on purpose; clip its corners rather than scroll sideways on phones. */}
      <div className="overflow-x-clip py-1">
        <DecisionStamp decision={d.outcome} by={d.decidedBy} at={date(d.decidedAt)} />
      </div>
      {approved && d.approvedCap !== undefined && <p className="text-sm font-medium text-ink">Credit cap {formatSar(d.approvedCap)}</p>}
      <p className="text-sm text-ink">{d.reasonText}</p>
      {d.conditions && d.conditions.length > 0 && (
        <div className="text-sm">
          <p className="font-medium text-ink">Conditions</p>
          <ul className="list-disc pl-5 text-ink-muted">
            {d.conditions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      {approved && facility && (
        <p className="text-sm text-ink-muted">
          Up to {facility.maxTenorDays} days per purchase order · Murabaha markup {(facility.profitRate * 100).toFixed(2)}% for the term (APR{" "}
          {(murabaha(facility.cap, facility.profitRate, facility.maxTenorDays).apr * 100).toFixed(1)}%) · suppliers are paid directly.
        </p>
      )}
    </section>
  );
}

function MoreInfoForm({ c }: { c: CreditCase }) {
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
      <Alert tone="caution" title="The credit manager needs more information">
        {c.decision?.reasonText}
        {items.length > 0 && (
          <ul className="mt-1 list-disc pl-5">
            {items.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
      </Alert>
      <label className="block text-sm font-medium text-ink">
        Attach files
        <input type="file" multiple className="mt-1 block text-sm font-normal" onChange={(e) => setFiles(Array.from(e.target.files ?? []).map((f) => f.name))} />
      </label>
      <Textarea label="Note to the credit manager" optional rows={2} value={note} onChange={(e) => setNote(e.target.value)} error={error ?? undefined} />
      <Button variant="primary" onClick={send} data-testid="credit-more-info-send">
        Send to credit manager
      </Button>
      <p className="text-xs text-ink-muted">Demo: files stay in your browser; only their names are recorded.</p>
    </div>
  );
}
