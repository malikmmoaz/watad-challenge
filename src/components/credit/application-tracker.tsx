"use client";

import { useState } from "react";
import { STATUS_LABEL, provideMoreInfo, trackerSteps, type StepState } from "@/domain/credit-application";
import { formatSar, murabaha } from "@/domain/money";
import type { CreditCase, CreditFacility } from "@/domain/types";
import { update } from "@/store";

const DOT: Record<StepState, string> = {
  done: "bg-emerald-600 border-emerald-600",
  current: "bg-white border-neutral-900 ring-4 ring-neutral-200",
  upcoming: "bg-white border-neutral-300",
  skipped: "bg-neutral-200 border-neutral-200",
};

const STATUS_TONE: Record<CreditCase["status"], string> = {
  draft: "bg-neutral-100 text-neutral-700",
  submitted: "bg-sky-50 text-sky-800",
  documents_review: "bg-sky-50 text-sky-800",
  in_assessment: "bg-sky-50 text-sky-800",
  more_info_requested: "bg-amber-50 text-amber-900",
  approved: "bg-emerald-50 text-emerald-800",
  declined: "bg-red-50 text-red-800",
};

const GATE_TEXT = { pass: "Checked", flag: "Checked, noted for review", fail: "Needs attention", pending: "Queued" } as const;

const date = (iso?: string) => (iso ? iso.slice(0, 10) : "");

/** Contractor view of one application: progress, checks, outcome and reasons. */
export function ApplicationTracker({ c, facility, readOnly = false }: { c: CreditCase; facility?: CreditFacility; readOnly?: boolean }) {
  const steps = trackerSteps(c);
  return (
    <article className="space-y-5 rounded-lg border border-neutral-200 bg-white p-5" data-testid={`credit-case-${c.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Application {c.id.replace("cc_", "#")} · {formatSar(c.requestedCap)} for {c.requestedTenorDays} days
          </h2>
          <p className="text-sm text-neutral-600">
            {c.purpose} · submitted {date(c.submittedAt)}
          </p>
        </div>
        <span data-testid="credit-tracker-status" data-status={c.status} className={`rounded px-2.5 py-1 text-sm font-medium ${STATUS_TONE[c.status]}`}>
          {STATUS_LABEL[c.status]}
        </span>
      </header>

      <ol className="grid gap-3 sm:grid-cols-5" aria-label="Application progress">
        {steps.map((s) => (
          <li key={s.key} className={`flex gap-2 sm:flex-col ${s.state === "skipped" ? "opacity-50" : ""}`} aria-current={s.state === "current" ? "step" : undefined}>
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${DOT[s.state]}`} aria-hidden />
            <div>
              <p className={`text-sm font-medium ${s.state === "upcoming" ? "text-neutral-500" : ""}`}>
                {s.label}
                {s.state === "skipped" && <span className="font-normal text-neutral-500"> · not needed</span>}
              </p>
              <p className="text-xs text-neutral-600">{s.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <section aria-label="Checks" className="text-sm">
        <h3 className="mb-2 font-medium">Checks, cheapest first</h3>
        <ul className="flex flex-wrap gap-2">
          {[...c.gates]
            .sort((a, b) => a.order - b.order)
            .map((g) => (
              <li key={g.id} className="rounded border border-neutral-200 px-2 py-1">
                {g.order}. {g.label}: <span className={g.result === "fail" ? "text-red-700" : "text-neutral-700"}>{GATE_TEXT[g.result]}</span>
              </li>
            ))}
        </ul>
      </section>

      <Outcome c={c} facility={facility} readOnly={readOnly} />

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">Activity ({c.log.length})</summary>
        <ul className="mt-2 space-y-1">
          {c.log.map((l, i) => (
            <li key={i} className="text-neutral-700">
              <span className="tabular-nums text-neutral-500">{l.at.replace("T", " ").slice(0, 16)}</span> · {l.action}
              {l.detail ? ` · ${l.detail}` : ""}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function Outcome({ c, facility, readOnly }: { c: CreditCase; facility?: CreditFacility; readOnly: boolean }) {
  const d = c.decision;
  if (c.status === "more_info_requested") return readOnly ? <p className="text-sm text-amber-900">Waiting for the contractor to provide more information.</p> : <MoreInfoForm c={c} />;
  if (!d || (c.status !== "approved" && c.status !== "declined")) {
    return <p className="text-sm text-neutral-600">No decision yet. An independent credit manager decides; the AI only prepares the file.</p>;
  }
  const approved = d.outcome === "approve";
  return (
    <section data-testid="credit-outcome" className={`space-y-2 rounded border p-4 text-sm ${approved ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
      <h3 className="font-semibold">{approved ? `Approved: credit cap ${d.approvedCap ? formatSar(d.approvedCap) : ""}` : "Declined"}</h3>
      <p>{d.reasonText}</p>
      {d.conditions && d.conditions.length > 0 && (
        <div>
          <p className="font-medium">Conditions</p>
          <ul className="list-disc pl-5">
            {d.conditions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      {approved && facility && (
        <p className="text-neutral-700">
          Available now {formatSar(facility.available)} of {formatSar(facility.cap)} · up to {facility.maxTenorDays} days · Murabaha markup {(facility.profitRate * 100).toFixed(2)}% for the term (APR{" "}
          {(murabaha(facility.cap, facility.profitRate, facility.maxTenorDays).apr * 100).toFixed(1)}%) · suppliers are paid directly.
        </p>
      )}
      <p className="text-xs text-neutral-600">
        Decided by {d.decidedBy} on {date(d.decidedAt)}.
      </p>
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
      const now = new Date().toISOString();
      const next = provideMoreInfo(c, files, note, now);
      update((s) => ({ ...s, creditCases: s.creditCases.map((x) => (x.id === c.id ? next : x)) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <section className="space-y-3 rounded border border-amber-200 bg-amber-50 p-4 text-sm" data-testid="credit-more-info">
      <h3 className="font-semibold">The credit manager needs more information</h3>
      {c.decision?.reasonText && <p>{c.decision.reasonText}</p>}
      {items.length > 0 && (
        <ul className="list-disc pl-5">
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      <label className="block">
        <span className="font-medium">Attach files</span>
        <input type="file" multiple className="mt-1 block text-sm" onChange={(e) => setFiles(Array.from(e.target.files ?? []).map((f) => f.name))} />
      </label>
      <label className="block">
        <span className="font-medium">Note to the credit manager</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full rounded border border-neutral-300 bg-white p-2" />
      </label>
      {error && <p className="text-red-700">{error}</p>}
      <button type="button" onClick={send} data-testid="credit-more-info-send" className="rounded bg-neutral-900 px-3 py-1.5 text-white">
        Send to credit manager
      </button>
      <p className="text-xs text-neutral-600">Demo: files stay in your browser; only their names are recorded.</p>
    </section>
  );
}
