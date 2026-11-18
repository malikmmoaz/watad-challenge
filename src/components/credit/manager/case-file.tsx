"use client";

import Link from "next/link";
import { applicantName, creditProfiles, reference } from "@/data";
import { checkConsistency } from "@/domain/credit/checks";
import type { FactorImpact, Outcome } from "@/domain/credit/impact";
import { formatSar, sar } from "@/domain/money";
import type { CreditDocument, EvidenceRef, GateResult } from "@/domain/types";
import { factorImpacts } from "@/domain/credit/impact";
import { runChecks } from "@/domain/credit/workflow";
import { update, useDemo } from "@/store";
import { AiLabel, Alert, Badge, Button, EmptyState, EvidenceSeal, Facts, FactorBar, PageHeader, Panel, SampleDataLabel, ScoreScale, type Tone } from "@/components/ui";
import { DecisionPanel } from "./decision-panel";
import { CaseStatus, shortDate } from "./shared";

const GATE: Record<GateResult, Tone> = { pass: "positive", flag: "caution", fail: "negative", pending: "neutral" };
const GATE_WORD: Record<GateResult, string> = { pass: "Pass", flag: "Flag", fail: "Fail", pending: "Not run" };
const POLICY: Record<"pass" | "refer" | "fail", Tone> = { pass: "positive", refer: "caution", fail: "negative" };
const pct = (n: number | null) => (n === null ? "n/a" : `${(n * 100).toFixed(1)}%`);

function Evidence({ refs, docs }: { refs: EvidenceRef[]; docs: CreditDocument[] }) {
  if (refs.length === 0) return <span className="text-xs text-caution">No document on file</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {refs.map((r) => {
        const d = docs.find((x) => x.id === r.documentId);
        const f = d?.extracted.find((x) => x.key === r.fieldKey);
        return <EvidenceSeal key={`${r.documentId}-${r.fieldKey}`} source={`${d?.fileName || d?.type || "document"}${f ? `, ${f.label}` : ""}`} href={`#${r.documentId}-${r.fieldKey}`} />;
      })}
    </span>
  );
}

/** Renders the simulated memo's small markdown subset: bold, bullets, paragraphs. */
function Memo({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm text-ink">
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return null;
        const html = line.replace(/^- /, "").split(/\*\*(.+?)\*\*|_(.+?)_/g);
        const parts = html.map((p, j) => (p === undefined ? null : j % 3 === 1 ? <strong key={j}>{p}</strong> : j % 3 === 2 ? <em key={j}>{p}</em> : p));
        return line.startsWith("- ") ? (
          <p key={i} className="pl-4 before:-ml-3 before:mr-1.5 before:content-['•']">
            {parts}
          </p>
        ) : (
          <p key={i}>{parts}</p>
        );
      })}
    </div>
  );
}

const outcomeText = (o: Outcome) => `score ${o.score}, band ${o.band}, limit ${formatSar(o.limit)}`;

/** Effect on score, band and limit: what full marks or zero on this factor would change. */
function ImpactLine({ impact, weight, points }: { impact?: FactorImpact; weight: number; points: number }) {
  if (!impact) return null;
  const same = (a: Outcome, b: Outcome) => a.band === b.band && a.limit === b.limit;
  return (
    <p className="text-xs text-ink-muted" data-testid="credit-factor-impact">
      <span className="font-medium text-ink">Effect:</span> adds {points.toFixed(1)} of {weight} points.{" "}
      {points < weight ? `At full marks: ${outcomeText(impact.atFull)}${same(impact.atFull, impact.current) ? " (band and limit unchanged)" : ""}. ` : "Already at full marks. "}
      Without it: {outcomeText(impact.atZero)}
      {same(impact.atZero, impact.current) ? " (band and limit unchanged)." : "."}
    </p>
  );
}

export function CaseFile({ id }: { id: string }) {
  const c = useDemo((s) => s.creditCases.find((x) => x.id === id));
  if (!c) {
    return (
      <EmptyState title="Application not found" action={<Link href="/credit">Back to the queue</Link>}>
        No credit application {id} in the demo data. Reset the demo data if you removed it.
      </EmptyState>
    );
  }
  const profile = creditProfiles[c.contractorId];
  const canRun = c.status === "submitted" || c.status === "documents_review";
  const run = () => {
    if (!profile) return;
    const next = runChecks(c, profile, new Date().toISOString()).case;
    update((s) => ({ ...s, creditCases: s.creditCases.map((x) => (x.id === c.id ? next : x)) }));
  };
  const consistency = profile && c.scorecard ? checkConsistency(profile) : null;
  const card = c.scorecard;
  const impacts = card ? factorImpacts(card, c.requestedCap) : [];

  return (
    <div className="space-y-6" data-testid="credit-case-file">
      <Link href="/credit" className="text-sm text-stamp underline underline-offset-[3px]">
        Back to the queue
      </Link>
      <PageHeader
        title={applicantName(c.contractorId, reference.contractors)}
        serial={c.id}
        status={<CaseStatus status={c.status} />}
        meta={`Requests ${formatSar(c.requestedCap)} for ${c.requestedTenorDays} days · ${c.purpose} · submitted ${shortDate(c.submittedAt)}`}
        actions={
          canRun ? (
            <Button variant="primary" onClick={run} disabled={!profile} data-testid="credit-run-checks">
              Run checks (simulated AI)
            </Button>
          ) : undefined
        }
      />
      {canRun && (
        <Alert tone="info" title="Checks have not run yet">
          Running them reads the documents and runs the gated checks cheapest first (CR, VAT, bank, financials, SIMAH last), then scores the file and drafts a memo. All simulated.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Gated checks, cheapest first" aside={<SampleDataLabel />}>
            <ol className="space-y-3" data-testid="credit-gates">
              {[...c.gates]
                .sort((a, b) => a.order - b.order)
                .map((g) => (
                  <li key={g.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-ink">
                        {g.order}. {g.label}
                      </span>
                      <Badge tone={GATE[g.result]}>{GATE_WORD[g.result]}</Badge>
                    </div>
                    <p className="text-sm text-ink-muted">{g.detail}</p>
                    {g.evidence.length > 0 && <Evidence refs={g.evidence} docs={c.documents} />}
                  </li>
                ))}
            </ol>
          </Panel>

          {card && (
            <Panel title="Scorecard" aside={<span className="text-sm text-ink-muted">10 factors, weights sum to 100</span>}>
              <div className="space-y-6">
                <ScoreScale score={card.total} />
                <ul className="space-y-5" data-testid="credit-factors">
                  {card.factors.map((f) => (
                    <li key={f.id} className="space-y-1.5">
                      <FactorBar label={f.label} points={f.points} weight={f.weight} note={f.rationale} />
                      <p className="text-xs text-ink-muted">
                        <span className="font-medium text-ink">Why it matters:</span> {f.whyItMatters}
                      </p>
                      <ImpactLine impact={impacts.find((i) => i.factorId === f.id)} weight={f.weight} points={f.points} />
                      <Evidence refs={f.evidence} docs={c.documents} />
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          )}

          {card && (
            <Panel title="Policy rules">
              <ul className="space-y-2 text-sm">
                {card.policyChecks.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3">
                    <span>
                      <span className="font-medium text-ink">{p.rule}</span>
                      <span className="block text-ink-muted">{p.observed}</span>
                    </span>
                    <Badge tone={POLICY[p.result]}>{p.result === "pass" ? "Met" : p.result === "fail" ? "Breached: decline" : "Breached: more information or a condition"}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Documents and extracted fields" aside={<AiLabel agent="Document reader" />}>
            <ul className="divide-y divide-line">
              {c.documents.map((d) => (
                <li key={d.id} className="space-y-2 py-3 first:pt-0">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">{d.fileName || d.type.replaceAll("_", " ")}</span>
                    <Badge tone={d.status === "flagged" ? "negative" : d.status === "missing" ? "caution" : d.status === "verified" ? "positive" : "neutral"}>{d.status}</Badge>
                  </div>
                  {d.extracted.length > 0 && (
                    <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                      {d.extracted.map((f) => (
                        <div key={f.key} id={`${d.id}-${f.key}`} className="flex justify-between gap-2 scroll-mt-24 target:bg-stamp-soft">
                          <dt className="text-ink-muted">{f.label}</dt>
                          <dd className="text-end tabular-nums text-ink">
                            {f.value} <span className={f.confidence < 0.8 ? "text-caution" : "text-ink-subtle"}>({Math.round(f.confidence * 100)}%)</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {d.findings.map((x, i) => (
                    <p key={i} className={`text-xs ${x.severity === "critical" ? "text-negative" : x.severity === "warning" ? "text-caution" : "text-ink-muted"}`}>
                      {x.kind === "tamper_signal" ? "Tamper signal: " : ""}
                      {x.text}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          {card && (
            <Panel title="Proposed limit">
              <div className="space-y-3">
                <Facts columns={1} items={card.capBasis.map((b) => ({ label: b.method, value: formatSar(b.amount) }))} />
                <p className="text-sm font-medium text-ink">Proposed credit cap {formatSar(card.proposedCap)}</p>
                <p className="text-xs text-ink-muted">Never above the {formatSar(c.requestedCap)} requested.</p>
              </div>
            </Panel>
          )}

          {(c.aiProposal || consistency) && (
            <Panel title="AI assist" aside={<AiLabel agent={c.aiProposal?.ai.agent ?? "Credit analyst"} confidence={c.aiProposal?.ai.confidence} />}>
              <div className="space-y-5" data-testid="credit-ai-panel">
                {consistency && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-medium text-ink">Revenue consistency: {consistency.status.replace("_", " ")}</h3>
                    <Facts
                      columns={1}
                      items={[
                        { label: "VAT-declared revenue", value: consistency.vatRevenueSar === null ? "n/a" : formatSar(sar(consistency.vatRevenueSar)) },
                        { label: `Bank inflows net of VAT (gap ${pct(consistency.bankVsVatDeviation)})`, value: consistency.bankInflowsExVatSar === null ? "n/a" : formatSar(sar(consistency.bankInflowsExVatSar)) },
                        { label: `Financial statements (gap ${pct(consistency.financialsVsVatDeviation)})`, value: consistency.financialsRevenueSar === null ? "n/a" : formatSar(sar(consistency.financialsRevenueSar)) },
                      ]}
                    />
                  </section>
                )}
                {c.aiProposal && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-medium text-ink">Drafted credit memo</h3>
                    <Memo text={c.aiProposal.memo} />
                  </section>
                )}
              </div>
            </Panel>
          )}

          {/* Remount when checks finish so the form starts from the fresh AI proposal. */}
          <DecisionPanel key={`${c.status}-${c.aiProposal ? "ai" : "none"}`} c={c} />

          <Panel title="Decision log">
            <ol className="space-y-2 text-sm" data-testid="credit-decision-log">
              {[...c.log].reverse().map((l, i) => (
                <li key={i}>
                  <span className="font-mono text-xs text-ink-muted">{l.at.replace("T", " ").slice(0, 16)}</span>{" "}
                  <span className="text-ink-muted">{l.actor.replace("_", " ")}</span> · <span className="text-ink">{l.action}</span>
                  {l.detail ? <span className="block text-xs text-ink-muted">{l.detail}</span> : null}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}

