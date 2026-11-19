"use client";

import Link from "next/link";
import { applicantName, creditProfiles, reference } from "@/data";
import { checkConsistency } from "@/domain/credit/checks";
import type { FactorImpact, Outcome } from "@/domain/credit/impact";
import { sar } from "@/domain/money";
import type { CreditCase, CreditDocument, EvidenceRef } from "@/domain/types";
import { factorImpacts } from "@/domain/credit/impact";
import { localizedAssessment, runChecks } from "@/domain/credit/workflow";
import { langFor } from "@/domain/credit/lang";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useLocale, useMessages } from "@/i18n/locale";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { update, useDemo } from "@/store";
import { useHydrated, useReducedMotion } from "../client-state";
import { AiLabel, Alert, Badge, Button, EmptyState, EvidenceSeal, Facts, FactorBar, Icon, LoadingRows, PageHeader, Panel, SampleDataLabel, type Tone } from "@/components/ui";
import { DecisionPanel } from "./decision-panel";
import { UtilisationPanel } from "./utilisation-panel";
import { GATE_RESULT } from "@/lib/status";
import { ScoreReveal } from "./score-reveal";
import { CaseStatus } from "./shared";
import { logAction, logDetail } from "../log-text";
import { fieldLabel, fieldValue } from "../field-text";
import { purposeText, seedText } from "../data-text";


/** Cases whose checks ran in this tab: their score is revealed once. */
const justScored = new Set<string>();

const POLICY: Record<"pass" | "refer" | "fail", Tone> = { pass: "positive", refer: "caution", fail: "negative" };

function Evidence({ caseId, refs, docs }: { caseId: string; refs: EvidenceRef[]; docs: CreditDocument[] }) {
  const m = useMessages(credit);
  const ar = useLocale() === "ar";
  if (refs.length === 0) return <span className="text-xs text-caution">{m.caseFile.noDocument}</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {refs.map((r) => {
        const d = docs.find((x) => x.id === r.documentId);
        const f = d?.extracted.find((x) => x.key === r.fieldKey);
        // The seal is a link to the field; its click bubbles here so opening evidence is counted.
        return (
          <span key={`${r.documentId}-${r.fieldKey}`} onClick={() => d && track("credit_evidence_opened", { case_id: caseId, document_type: d.type })}>
            <EvidenceSeal source={`${d?.fileName || (d ? m.documents[d.type].label : "")}${f ? `, ${fieldLabel(f, m, ar)}` : ""}`} href={`#${r.documentId}-${r.fieldKey}`} />
          </span>
        );
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
          <p key={i} className="ps-4 before:-ms-3 before:me-1.5 before:content-['•']">
            {parts}
          </p>
        ) : (
          <p key={i}>{parts}</p>
        );
      })}
    </div>
  );
}

/** Effect on score, band and limit: what full marks or zero on this factor would change. */
function ImpactLine({ impact, weight, points }: { impact?: FactorImpact; weight: number; points: number }) {
  const m = useMessages(credit).caseFile;
  const f = useFormat();
  if (!impact) return null;
  const outcomeText = (o: Outcome) => fill(m.outcome, { score: o.score, band: o.band, limit: f.money(o.limit) });
  const same = (a: Outcome, b: Outcome) => a.band === b.band && a.limit === b.limit;
  return (
    <p className="text-xs text-ink-muted" data-testid="credit-factor-impact">
      <span className="font-medium text-ink">{m.effectLabel}</span> {fill(m.effectAdds, { points: points.toFixed(1), weight })}{" "}
      {points < weight ? `${fill(m.atFull, { outcome: outcomeText(impact.atFull) })}${same(impact.atFull, impact.current) ? m.unchanged : ""}. ` : `${m.alreadyFull} `}
      {fill(m.without, { outcome: outcomeText(impact.atZero) })}
      {same(impact.atZero, impact.current) ? `${m.unchanged}.` : "."}
    </p>
  );
}

/** What the simulated AI does when the manager runs the checks, shown step by step. */
const PREP_STEPS = ["read", "cr", "vat", "bank", "financials", "simah", "score", "memo"] as const;
const STEP_MS = 260;

function Preparing({ step }: { step: number }) {
  const m = useMessages(credit).caseFile;
  return (
    <div data-testid="credit-preparing" role="status" aria-live="polite">
      <Panel title={m.preparing} aside={<AiLabel agent={m.analyst} />}>
        <ol className="space-y-2 text-sm">
          {PREP_STEPS.map((key, i) => (
            <li key={key} className={`flex items-center gap-2 transition-opacity duration-200 ${i > step ? "opacity-40" : ""}`}>
              <span className={`flex size-4 items-center justify-center rounded-full border ${i < step ? "border-positive bg-positive text-on-action" : i === step ? "border-ink" : "border-line-strong"}`}>
                {i < step ? <Icon name="check" size={10} strokeWidth={2.5} /> : i === step ? <span className="size-1.5 animate-pulse rounded-full bg-ink" /> : null}
              </span>
              <span className={i <= step ? "text-ink" : "text-ink-subtle"}>{m.prepSteps[key]}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-ink-muted">{m.prepNote}</p>
      </Panel>
    </div>
  );
}

/** Scorecard factor ids as the engine names them, for the factor messages. */
const FACTOR_KEY = { bank_cashflow: "bank_behaviour", compliance: "compliance_disputes" } as const;
const factorKey = (id: string) => (FACTOR_KEY[id as keyof typeof FACTOR_KEY] ?? id) as keyof typeof credit.en.factors;

export function CaseFile({ id }: { id: string }) {
  const all = useMessages(credit);
  const m = all.caseFile;
  const f = useFormat();
  const locale = useLocale();
  const c = useDemo((s) => s.creditCases.find((x) => x.id === id));
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const [step, setStep] = useState<number | null>(null);
  const caseId = c?.id;
  const hasMemo = !!c?.aiProposal;
  // Once per visit to a case, and once per memo shown (on open, or when the checks produce it).
  useEffect(() => {
    if (hydrated && caseId) track("credit_case_opened", { case_id: caseId });
  }, [hydrated, caseId]);
  useEffect(() => {
    if (hydrated && caseId && hasMemo) track("credit_memo_viewed", { case_id: caseId, simulated_ai: true });
  }, [hydrated, caseId, hasMemo]);
  if (!hydrated) return <LoadingRows rows={8} label={m.loading} />;
  if (!c) {
    return (
      <EmptyState title={m.notFoundTitle} action={<Link href="/credit">{m.backToQueue}</Link>}>
        {fill(m.notFound, { id })}
      </EmptyState>
    );
  }
  const profile = creditProfiles[c.contractorId];
  // A case can be scored if it has not been yet, including a seeded one already in assessment.
  const canRun = c.status === "submitted" || c.status === "documents_review" || (c.status === "in_assessment" && !c.scorecard);
  const commit = () => {
    if (!profile) return;
    const { case: next, assessment } = runChecks(c, profile, new Date().toISOString());
    if (next.aiProposal) {
      track("credit_checks_run", {
        case_id: c.id,
        band: assessment.band,
        proposed_outcome: next.aiProposal.outcome,
        provisional: assessment.provisional,
        simulated_ai: true,
      });
    }
    update((s) => ({ ...s, creditCases: s.creditCases.map((x) => (x.id === c.id ? next : x)) }));
    justScored.add(c.id);
    setStep(null);
  };
  // Steps through the preparation, then records the result; instant with reduced motion.
  const run = () => {
    if (!profile || step !== null) return;
    if (reduced) return commit();
    setStep(0);
    PREP_STEPS.forEach((_, i) => setTimeout(() => setStep(i + 1), STEP_MS * (i + 1)));
    setTimeout(commit, STEP_MS * (PREP_STEPS.length + 1));
  };
  const consistency = profile && c.scorecard ? checkConsistency(profile) : null;
  // Stored text is English; in Arabic re-render the engine's text from the same inputs.
  const view = locale === "ar" ? localizedAssessment(c, profile, langFor("ar")) : null;
  const card = view && c.scorecard ? { ...c.scorecard, factors: view.scorecard.factors.map((vf) => ({ ...vf, evidence: c.scorecard!.factors.find((x) => x.id === vf.id)?.evidence ?? vf.evidence })), policyChecks: view.scorecard.policyChecks, capBasis: view.scorecard.capBasis } : c.scorecard;
  const memo = view?.memo ?? c.aiProposal?.memo;
  const gateDetail = (g: CreditCase["gates"][number]) =>
    view?.gates.find((x) => x.id === g.id)?.detail ?? (g.detail === "Queued." ? all.checks.queued : g.detail === "Runs last." ? all.checks.runsLast : seedText(g.detail, credit.en as never, all));
  const contractor = reference.contractors.find((x) => x.id === c.contractorId);
  const title = (locale === "ar" ? contractor?.nameAr : undefined) ?? applicantName(c.contractorId, reference.contractors);
  const pct = (n: number | null) => (n === null ? m.notAvailable : f.percent(n, 1));
  const impacts = card ? factorImpacts(card, c.requestedCap) : [];

  return (
    <div className="space-y-6" data-testid="credit-case-file">
      <Link href="/credit" className="text-sm text-stamp underline underline-offset-[3px]">
        {m.backToQueue}
      </Link>
      <PageHeader
        eyebrow={m.eyebrow}
        title={title}
        serial={c.id}
        status={<CaseStatus status={c.status} />}
        meta={fill(m.meta, { cap: f.money(c.requestedCap), days: c.requestedTenorDays, purpose: purposeText(c.purpose, credit.en as never, all), date: c.submittedAt ? f.date(c.submittedAt) : m.notYet })}
        actions={
          canRun ? (
            <Button variant="primary" onClick={run} disabled={!profile} loading={step !== null} data-testid="credit-run-checks">
              {m.runChecks}
            </Button>
          ) : undefined
        }
      />
      {step !== null && <Preparing step={step} />}
      {canRun && step === null && (
        <Alert tone="info" title={m.notRunTitle}>
          {m.notRun}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Panel title={m.gatesTitle} aside={<SampleDataLabel />}>
            <ol className="space-y-3" data-testid="credit-gates">
              {[...c.gates]
                .sort((a, b) => a.order - b.order)
                .map((g) => (
                  <li key={g.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-ink">
                        {g.order}. {all.checks.label[g.id]}
                      </span>
                      <Badge tone={GATE_RESULT[g.result].tone}>{g.result === "pending" && card ? m.notRunYet : all.caseFile.gateResult[g.result]}</Badge>
                    </div>
                    <p className="text-sm text-ink-muted">{gateDetail(g)}</p>
                    {g.evidence.length > 0 && <Evidence caseId={c.id} refs={g.evidence} docs={c.documents} />}
                  </li>
                ))}
            </ol>
          </Panel>

          {card && (
            <Panel title={m.scorecard} aside={<span className="text-sm text-ink-muted">{m.scorecardAside}</span>}>
              <div className="space-y-6">
                <ScoreReveal score={card.total} animate={justScored.has(c.id)} />
                <ul className="space-y-5" data-testid="credit-factors">
                  {card.factors.map((fa) => (
                    <li key={fa.id} className="space-y-1.5">
                      <FactorBar label={all.factors[factorKey(fa.id)].label} points={fa.points} weight={fa.weight} note={seedText(fa.rationale, credit.en as never, all)} />
                      <p className="text-xs text-ink-muted">
                        <span className="font-medium text-ink">{m.whyLabel}</span> {all.factors[factorKey(fa.id)].why}
                      </p>
                      <ImpactLine impact={impacts.find((i) => i.factorId === fa.id)} weight={fa.weight} points={fa.points} />
                      <Evidence caseId={c.id} refs={fa.evidence} docs={c.documents} />
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          )}

          {card && (
            <Panel title={m.policyTitle}>
              <ul className="space-y-2 text-sm">
                {card.policyChecks.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <span>
                      <span className="font-medium text-ink">{seedText(p.rule, credit.en as never, all)}</span>
                      <span className="block text-ink-muted">{seedText(p.observed, credit.en as never, all)}</span>
                    </span>
                    <Badge tone={POLICY[p.result]}>{p.result === "pass" ? m.policyMet : p.result === "fail" ? m.policyDeclines : m.policyReview}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title={m.documentsTitle} aside={<AiLabel agent={m.documentReader} />}>
            <ul className="divide-y divide-line">
              {c.documents.map((d) => (
                <li key={d.id} className="space-y-2 py-3 first:pt-0">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">{d.fileName || all.documents[d.type].label}</span>
                    <Badge tone={d.status === "flagged" ? "negative" : d.status === "missing" ? "caution" : d.status === "verified" ? "positive" : "neutral"}>{all.documentStatus[d.status]}</Badge>
                  </div>
                  {d.extracted.length > 0 && (
                    <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                      {d.extracted.map((x) => (
                        <div key={x.key} id={`${d.id}-${x.key}`} className="flex justify-between gap-2 scroll-mt-24 target:bg-stamp-soft">
                          <dt className="text-ink-muted">{fieldLabel(x, all, locale === "ar")}</dt>
                          <dd className="text-end tabular-nums text-ink">
                            {fieldValue(x.value, all, f, locale === "ar")} <span className={x.confidence < 0.8 ? "text-caution" : "text-ink-subtle"}>({f.percent(x.confidence)})</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {d.findings.map((x, i) => (
                    <p key={i} className={`text-xs ${x.severity === "critical" ? "text-negative" : x.severity === "warning" ? "text-caution" : "text-ink-muted"}`}>
                      {x.kind === "tamper_signal" ? `${m.tamperSignal} ` : ""}
                      {seedText(x.text, credit.en as never, all)}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          {card && (
            <Panel title={m.limitTitle}>
              <div className="space-y-3">
                <Facts columns={1} items={card.capBasis.map((b) => ({ label: b.method, value: f.money(b.amount) }))} />
                <p className="text-sm font-medium text-ink">{fill(m.proposedCap, { cap: f.money(card.proposedCap) })}</p>
                <p className="text-xs text-ink-muted">{fill(m.neverAbove, { cap: f.money(c.requestedCap) })}</p>
              </div>
            </Panel>
          )}

          {(c.aiProposal || consistency) && (
            <Panel title={m.aiTitle} aside={<AiLabel agent={c.aiProposal ? m.memoDrafter : m.analyst} confidence={c.aiProposal?.ai.confidence} />}>
              <div className="space-y-5" data-testid="credit-ai-panel">
                {consistency && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-medium text-ink">{fill(m.consistency, { status: m.consistencyStatus[consistency.status] })}</h3>
                    <Facts
                      columns={1}
                      items={[
                        { label: m.vatRevenue, value: consistency.vatRevenueSar === null ? m.notAvailable : f.money(sar(consistency.vatRevenueSar)) },
                        { label: fill(m.bankNet, { gap: pct(consistency.bankVsVatDeviation) }), value: consistency.bankInflowsExVatSar === null ? m.notAvailable : f.money(sar(consistency.bankInflowsExVatSar)) },
                        { label: fill(m.financialsRevenue, { gap: pct(consistency.financialsVsVatDeviation) }), value: consistency.financialsRevenueSar === null ? m.notAvailable : f.money(sar(consistency.financialsRevenueSar)) },
                      ]}
                    />
                  </section>
                )}
                {c.aiProposal && (
                  <section className="space-y-2">
                    <div className="rounded-xl border border-dashed border-ai-line bg-ai-soft p-4" data-testid="credit-ai-memo">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-ink">{m.memoTitle}</h3>
                        <AiLabel agent={m.memoDrafter} confidence={c.aiProposal.ai.confidence} />
                      </div>
                      <Memo text={memo ?? seedText(c.aiProposal.memo, credit.en as never, all)} />
                      <p className="mt-3 border-t border-ai-line pt-2 text-xs text-ai">{m.memoNotDecision}</p>
                    </div>
                  </section>
                )}
              </div>
            </Panel>
          )}

          {/* Remount when checks finish so the form starts from the fresh AI proposal. */}
          <DecisionPanel key={`${c.status}-${c.aiProposal ? "ai" : "none"}`} c={c} />

          {c.status === "approved" && <UtilisationPanel caseId={c.id} />}

          <Panel title={m.logTitle}>
            <ol className="space-y-2 text-sm" data-testid="credit-decision-log">
              {[...c.log].reverse().map((l, i) => (
                <li key={i}>
                  <span className="text-xs tabular-nums text-ink-muted">{f.dateTime(l.at)}</span>{" "}
                  <span className="text-ink-muted">{m.actor[l.actor]}</span> · <span className="text-ink">{logAction(l.action, all)}</span>
                  {l.detail ? <span className="block text-xs text-ink-muted">{logDetail(l.detail, all)}</span> : null}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}

