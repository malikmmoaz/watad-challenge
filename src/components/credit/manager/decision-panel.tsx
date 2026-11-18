"use client";

import { useState } from "react";
import { demoPersona } from "@/data";
import { decide, validateDecision, type DecisionInput } from "@/domain/credit/workflow";
import { formatSar } from "@/domain/money";
import type { CreditCase, CreditDecisionOutcome } from "@/domain/types";
import { getState, update } from "@/store";
import { Alert, Button, DecisionStamp, Input, Panel, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

const OUTCOMES: { value: CreditDecisionOutcome; label: string }[] = [
  { value: "approve", label: "Approve" },
  { value: "request_info", label: "Request more information" },
  { value: "decline", label: "Decline" },
];
/** Cases decided in this tab, so their stamp is pressed in once, not on every visit. */
const justDecided = new Set<string>();
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/** Approve / request more information / decline with structured reasons that go back to the contractor. */
export function DecisionPanel({ c }: { c: CreditCase }) {
  const ai = c.aiProposal;
  const [outcome, setOutcome] = useState<CreditDecisionOutcome>(ai?.outcome ?? "approve");
  const [cap, setCap] = useState<number>(ai?.proposedCap ? ai.proposedCap / 100 : c.scorecard ? c.scorecard.proposedCap / 100 : 0);
  const [reason, setReason] = useState("");
  const [conditions, setConditions] = useState("");
  const [items, setItems] = useState("");
  const [override, setOverride] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  if (c.decision && c.status !== "in_assessment") {
    const d = c.decision;
    const fresh = justDecided.has(c.id);
    return (
      <Panel title="Decision" aside={<span className="text-xs text-ink-muted">Recorded · sent to the contractor</span>}>
        <div className="space-y-4 text-sm" data-testid="credit-decision">
          <div className="flex justify-center overflow-x-clip rounded-xl bg-paper px-2 py-6">
            <DecisionStamp decision={d.outcome} by={d.decidedBy} at={formatDateTime(d.decidedAt)} animate={fresh} />
          </div>
          {d.approvedCap !== undefined && (
            <p className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
              <span className="text-ink-muted">Credit cap</span>
              <span className="text-xl font-semibold tabular-nums text-ink">{formatSar(d.approvedCap)}</span>
            </p>
          )}
          <div>
            <p className="text-xs font-medium text-ink-muted">Reason given to the contractor</p>
            <p className="mt-1 text-ink">{d.reasonText}</p>
          </div>
          {d.requestedItems && d.requestedItems.length > 0 && (
            <ul className="list-disc pl-5 text-ink-muted">
              {d.requestedItems.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
          {d.overrodeAi && <p className="text-xs text-caution">Departed from the AI proposal: {d.overrideReason}</p>}
        </div>
      </Panel>
    );
  }
  if (c.status !== "in_assessment") return null;

  const input: DecisionInput = {
    outcome,
    decidedBy: demoPersona.credit,
    reasonCodes: ai?.reasonCodes ?? [],
    reasonText: reason,
    approvedCapSar: outcome === "approve" ? cap : undefined,
    conditions: outcome === "approve" ? lines(conditions) : undefined,
    requestedItems: outcome === "request_info" ? lines(items) : undefined,
    overrideReason: override,
  };
  const overriding = !!ai && ai.outcome !== outcome;
  const submit = () => {
    const e = validateDecision(c, input);
    setErrors(e);
    if (e.length > 0) return;
    const now = new Date().toISOString();
    const current = getState().creditFacilities.find((f) => f.contractorId === c.contractorId);
    const { case: next, facility } = decide(c, input, now, current);
    justDecided.add(c.id);
    update((s) => ({
      ...s,
      creditCases: s.creditCases.map((x) => (x.id === c.id ? next : x)),
      creditFacilities: facility ? [...s.creditFacilities.filter((f) => f.contractorId !== facility.contractorId), facility] : s.creditFacilities,
    }));
  };

  return (
    <Panel title="Your decision">
      <div className="space-y-4" data-testid="credit-decision-form">
        {ai && (
          <p className="text-sm text-ink-muted">
            AI proposes <span className="font-medium text-ink">{OUTCOMES.find((o) => o.value === ai.outcome)?.label.toLowerCase()}</span>
            {ai.proposedCap ? ` at ${formatSar(ai.proposedCap)}` : ""}. You decide.
          </p>
        )}
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Outcome</legend>
          {OUTCOMES.map((o) => (
            <label
              key={o.value}
              className={`flex h-10 cursor-pointer items-center rounded-md border px-3 text-sm ${outcome === o.value ? "border-pine bg-pine text-on-pine" : "border-line-control bg-surface text-ink"}`}
            >
              <input type="radio" name="outcome" className="sr-only" checked={outcome === o.value} onChange={() => setOutcome(o.value)} data-testid={`credit-outcome-${o.value}`} />
              {o.label}
            </label>
          ))}
        </fieldset>
        {outcome === "approve" && (
          <>
            <Input label="Approved credit cap" suffix="SAR" type="number" value={Number.isNaN(cap) ? "" : cap} onChange={(e) => setCap(e.target.valueAsNumber)} data-testid="credit-decision-cap" />
            <Textarea label="Conditions, one per line" optional value={conditions} onChange={(e) => setConditions(e.target.value)} />
          </>
        )}
        {outcome === "request_info" && (
          <Textarea label="What the contractor must provide, one per line" value={items} onChange={(e) => setItems(e.target.value)} data-testid="credit-decision-items" />
        )}
        <Textarea
          label="Reason shown to the contractor"
          hint="Plain words: what drove the decision and what would change it."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          data-testid="credit-decision-reason"
        />
        {overriding && (
          <Textarea label="Why you are departing from the AI proposal" value={override} onChange={(e) => setOverride(e.target.value)} data-testid="credit-decision-override" />
        )}
        {errors.length > 0 && (
          <Alert tone="negative" title="Not recorded yet">
            {errors.join(" ")}
          </Alert>
        )}
        <Button variant="primary" onClick={submit} data-testid="credit-decision-submit">
          Record decision
        </Button>
      </div>
    </Panel>
  );
}
