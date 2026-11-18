"use client";

import { useState } from "react";
import { demoPersona } from "@/data";
import { decide, validateDecision, type DecisionInput } from "@/domain/credit/workflow";
import { formatSar } from "@/domain/money";
import type { CreditCase, CreditDecisionOutcome } from "@/domain/types";
import { update } from "@/store";
import { Alert, Button, DecisionStamp, Input, Panel, Textarea } from "@/components/ui";
import { shortDate } from "./shared";

const OUTCOMES: { value: CreditDecisionOutcome; label: string }[] = [
  { value: "approve", label: "Approve" },
  { value: "request_info", label: "Request more information" },
  { value: "decline", label: "Decline" },
];
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
    return (
      <Panel title="Decision">
        <div className="space-y-3 text-sm" data-testid="credit-decision">
          <DecisionStamp decision={d.outcome} by={d.decidedBy} at={shortDate(d.decidedAt)} />
          {d.approvedCap !== undefined && <p className="font-medium text-ink">Credit cap {formatSar(d.approvedCap)}</p>}
          <p className="text-ink">{d.reasonText}</p>
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
    const { case: next, facility } = decide(c, input, now);
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
