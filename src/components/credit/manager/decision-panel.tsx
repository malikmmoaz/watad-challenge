"use client";

import { useState } from "react";
import { demoPersona } from "@/data";
import { decide, validateDecision, type DecisionInput } from "@/domain/credit/workflow";
import type { CreditCase, CreditDecisionOutcome } from "@/domain/types";
import { track } from "@/lib/analytics";
import { getState, update, useDemo } from "@/store";
import { Alert, Button, DecisionStamp, Input, Panel, Textarea } from "@/components/ui";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useMessages } from "@/i18n/locale";
import { personName, seedText } from "../data-text";

const OUTCOMES: CreditDecisionOutcome[] = ["approve", "request_info", "decline"];

/** validateDecision() speaks English; show each error in the reader's language. */
const ERROR_KEY = new Map(Object.entries(credit.en.decision.errors).map(([k, v]) => [v as string, k as keyof typeof credit.en.decision.errors]));
/** Cases decided in this tab, so their stamp is pressed in once, not on every visit. */
const justDecided = new Set<string>();
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/** Approve / request more information / decline with structured reasons that go back to the contractor. */
export function DecisionPanel({ c }: { c: CreditCase }) {
  const all = useMessages(credit);
  const m = all.decision;
  const f = useFormat();
  const ai = c.aiProposal;
  const [outcome, setOutcome] = useState<CreditDecisionOutcome>(ai?.outcome ?? "approve");
  const proposedCap = ai?.proposedCap ?? c.scorecard?.proposedCap;
  // Prefilled with the proposed cap; empty (never 0) when there is no proposal yet.
  const [cap, setCap] = useState<number>(proposedCap ? proposedCap / 100 : Number.NaN);
  const currentCap = useDemo((s) => s.creditFacilities.find((x) => x.contractorId === c.contractorId)?.cap);
  const [reason, setReason] = useState("");
  const [conditions, setConditions] = useState("");
  const [items, setItems] = useState("");
  const [override, setOverride] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  if (c.decision && c.status !== "in_assessment") {
    const d = c.decision;
    const fresh = justDecided.has(c.id);
    return (
      <Panel title={m.decidedTitle} aside={<span className="text-xs text-ink-muted">{m.recorded}</span>}>
        <div className="space-y-4 text-sm" data-testid="credit-decision">
          <div className="flex justify-center overflow-x-clip rounded-xl bg-paper px-2 py-6">
            <DecisionStamp decision={d.outcome} by={personName(d.decidedBy, credit.en as never, all)} at={f.date(d.decidedAt)} animate={fresh} />
          </div>
          {d.approvedCap !== undefined && (
            <p className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
              <span className="text-ink-muted">{m.capHeadline}</span>
              <span className="text-xl font-semibold tabular-nums text-ink">{f.money(d.approvedCap)}</span>
            </p>
          )}
          <div>
            <p className="text-xs font-medium text-ink-muted">{m.reasonGiven}</p>
            <p className="mt-1 text-ink">{seedText(d.reasonText, credit.en as never, all)}</p>
          </div>
          {d.requestedItems && d.requestedItems.length > 0 && (
            <ul className="list-disc ps-5 text-ink-muted">
              {d.requestedItems.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
          {d.overrodeAi && <p className="text-xs text-caution">{fill(m.departed, { why: d.overrideReason ?? "" })}</p>}
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
    track("credit_decision_made", { case_id: c.id, outcome: input.outcome, overrode_ai: next.decision?.overrodeAi ?? false });
    justDecided.add(c.id);
    update((s) => ({
      ...s,
      creditCases: s.creditCases.map((x) => (x.id === c.id ? next : x)),
      creditFacilities: facility ? [...s.creditFacilities.filter((f) => f.contractorId !== facility.contractorId), facility] : s.creditFacilities,
    }));
  };

  return (
    <Panel title={m.title}>
      <div className="space-y-4" data-testid="credit-decision-form">
        {ai && (
          <p className="text-sm text-ink-muted">
            {ai.proposedCap
              ? fill(m.aiProposesCap, { outcome: m.outcomes[ai.outcome].toLowerCase(), cap: f.money(ai.proposedCap) })
              : fill(m.aiProposes, { outcome: m.outcomes[ai.outcome].toLowerCase() })}
          </p>
        )}
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">{m.outcomesLegend}</legend>
          {OUTCOMES.map((o) => (
            <label
              key={o}
              className={`flex h-10 cursor-pointer items-center rounded-md border px-3 text-sm ${outcome === o ? "border-pine bg-pine text-on-pine" : "border-line-control bg-surface text-ink"}`}
            >
              <input type="radio" name="outcome" className="sr-only" checked={outcome === o} onChange={() => setOutcome(o)} data-testid={`credit-outcome-${o}`} />
              {m.outcomes[o]}
            </label>
          ))}
        </fieldset>
        {outcome === "approve" && (
          <>
            <Input
              label={m.capLabel}
              suffix={all.apply.capSuffix}
              type="number"
              value={Number.isNaN(cap) ? "" : cap}
              onChange={(e) => setCap(e.target.valueAsNumber)}
              hint={proposedCap ? fill(m.capHintProposed, { cap: f.money(proposedCap), requested: f.money(c.requestedCap) }) : fill(m.capHintNone, { requested: f.money(c.requestedCap) })}
              data-testid="credit-decision-cap"
            />
            {currentCap !== undefined && Number.isFinite(cap) && (
              <p className={`-mt-2 text-sm ${cap * 100 < currentCap ? "text-caution" : "text-ink-muted"}`} data-testid="credit-decision-current-cap">
                {cap * 100 < currentCap
                  ? fill(m.belowCurrent, { current: f.money(currentCap) })
                  : fill(m.currentToProposed, { current: f.money(currentCap), proposed: f.money((cap * 100) as never) })}
              </p>
            )}
            <Textarea label={m.conditionsLabel} optional value={conditions} onChange={(e) => setConditions(e.target.value)} />
          </>
        )}
        {outcome === "request_info" && (
          <Textarea label={m.itemsLabel} value={items} onChange={(e) => setItems(e.target.value)} data-testid="credit-decision-items" />
        )}
        <Textarea
          label={m.reasonLabel}
          hint={m.reasonHint}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          data-testid="credit-decision-reason"
        />
        {overriding && (
          <Textarea label={m.overrideLabel} value={override} onChange={(e) => setOverride(e.target.value)} data-testid="credit-decision-override" />
        )}
        {errors.length > 0 && (
          <Alert tone="negative" title={m.notRecorded}>
            {errors.map((e) => (ERROR_KEY.has(e) ? m.errors[ERROR_KEY.get(e)!] : e)).join(" ")}
          </Alert>
        )}
        <Button variant="primary" onClick={submit} data-testid="credit-decision-submit">
          {m.record}
        </Button>
      </div>
    </Panel>
  );
}
