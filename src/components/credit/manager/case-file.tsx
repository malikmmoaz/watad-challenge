"use client";

import Link from "next/link";
import { applicantName, applicantNameAr, creditProfiles, reference } from "@/data";
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
import { WhatIfPanel } from "./what-if-panel";
import { outcomeOf } from "@/domain/credit/what-if";
import { CashflowChart } from "./cashflow-chart";
import { GATE_RESULT } from "@/lib/status";
import { ScoreReveal } from "./score-reveal";
import { CaseStatus } from "./shared";
import { logAction, logDetail } from "../log-text";
import { fieldLabel, fieldValue } from "../field-text";
import { applicantLabel, isolateLtr, purposeText, seedText } from "../data-text";


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
            <EvidenceSeal source={`${d?.fileName ? isolateLtr(d.fileName, ar) : d ? m.documents[d.type].label : ""}${f ? `${ar ? "، " : ", "}${fieldLabel(f, m, ar)}` : ""}`} href={`#${r.documentId}-${r.fieldKey}`} />
          </span>
        );
      })}
    </span>
  );
}

/** Renders the simulated memo's small markdown subset: bold, bullets, paragraphs. */
function Memo({ text }: { text: string }) {
  const m = useMessages(credit).caseFile;
  const line = (raw: string, i: number) => {
    const html = raw.replace(/^- /, "").split(/\*\*(.+?)\*\*|_(.+?)_/g);
    const parts = html.map((p, j) => (p === undefined ? null : j % 3 === 1 ? <strong key={j}>{p}</strong> : j % 3 === 2 ? <em key={j}>{p}</em> : p));
    return raw.startsWith("- ") ? (
      <p key={i} className="ps-4 before:-ms-3 before:me-1.5 before:content-['•']">
        {parts}
      </p>
    ) : (
      <p key={i}>{parts}</p>
    );
  };
  const lines = text.split("\n").filter((x) => x.trim());
  // The recommendation leads; the full memo opens on demand.
  const [head, ...rest] = lines;
  return (
    <div className="space-y-1.5 text-sm text-ink">
      {head && line(head, 0)}
      {rest.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-sm font-medium text-stamp underline underline-offset-[3px] [&::-webkit-details-marker]:hidden">{m.readMemo}</summary>
          <div className="mt-1.5 space-y-1.5">{rest.map((x, i) => line(x, i + 1))}</div>
        </details>
      )}
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

/** The three strongest and two weakest factors, by share of their weight earned; each opens its row. */
function TopFactors({ factors }: { factors: { id: string; points: number; weight: number }[] }) {
  const all = useMessages(credit);
  const m = all.caseFile;
  const f = useFormat();
  const ranked = [...factors].filter((x) => x.weight > 0).sort((a, b) => b.points / b.weight - a.points / a.weight);
  const strongest = ranked.slice(0, 3);
  const weakest = ranked.slice(-2).reverse();
  const open = (id: string) => {
    const el = document.getElementById(`factor-${id}`)?.querySelector("details");
    if (el) el.open = true;
  };
  const chip = (x: (typeof factors)[number], tone: string) => (
    <li key={x.id}>
      <a href={`#factor-${x.id}`} onClick={() => open(x.id)} className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1 text-sm hover:bg-paper">
        <span className="text-ink underline decoration-line-strong underline-offset-[3px]">{all.factors[factorKey(x.id)].label}</span>
        <span className={`shrink-0 tabular-nums ${tone}`}>{f.percent(x.points / x.weight)}</span>
      </a>
    </li>
  );
  return (
    <section aria-label={m.topFactors} className="grid gap-3 rounded-xl bg-paper p-3 sm:grid-cols-2" data-testid="credit-top-factors">
      <div>
        <h3 className="px-2 text-xs font-semibold text-ink-muted">{m.strongest}</h3>
        <ul className="mt-1" data-testid="credit-top-strongest">{strongest.map((x) => chip(x, "text-positive"))}</ul>
      </div>
      <div>
        <h3 className="px-2 text-xs font-semibold text-ink-muted">{m.weakest}</h3>
        <ul className="mt-1" data-testid="credit-top-weakest">{weakest.map((x) => chip(x, "text-caution"))}</ul>
      </div>
      <p className="px-2 text-xs text-ink-muted sm:col-span-2">{m.topFactorsNote}</p>
    </section>
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

/**
 * Evidence links point at fields inside collapsed rows (documents, factors). Open the row
 * that holds the target before the browser scrolls to it, on click and on a hash in the URL.
 */
function useOpenTargets() {
  useEffect(() => {
    const reveal = (hash: string) => {
      const el = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
      const box = el?.closest("details");
      if (box && !box.open) box.open = true;
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (a) reveal(a.getAttribute("href")!);
    };
    const onHash = () => reveal(window.location.hash);
    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);
}

export function CaseFile({ id }: { id: string }) {
  const all = useMessages(credit);
  const m = all.caseFile;
  const f = useFormat();
  const locale = useLocale();
  const c = useDemo((s) => s.creditCases.find((x) => x.id === id));
  const hydrated = useHydrated();
  useOpenTargets();
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
  // The what-if uses the same date the checks ran, so "today" matches the scorecard above.
  const checksRanOn = ([...c.log].reverse().find((l) => l.action === "Gated checks run (simulated)")?.at ?? c.updatedAt).slice(0, 10);
  const caseProfile = profile ? { ...profile, id: c.id, request: { capSar: c.requestedCap / 100, tenorDays: c.requestedTenorDays } } : null;
  // Only for files the engine scored: a hand-written seed scorecard would not match "today" in the simulation.
  const whatIfProfile = caseProfile && c.scorecard && Math.abs(outcomeOf(caseProfile, checksRanOn).score - c.scorecard.total) <= 1 ? caseProfile : null;
  // Stored text is English; in Arabic re-render the engine's text from the same inputs.
  const view = locale === "ar" ? localizedAssessment(c, profile, langFor("ar")) : null;
  const card = view && c.scorecard ? { ...c.scorecard, factors: view.scorecard.factors.map((vf) => ({ ...vf, evidence: c.scorecard!.factors.find((x) => x.id === vf.id)?.evidence ?? vf.evidence })), policyChecks: view.scorecard.policyChecks, capBasis: view.scorecard.capBasis } : c.scorecard;
  const memo = view?.memo ?? c.aiProposal?.memo;
  const gateDetail = (g: CreditCase["gates"][number]) =>
    view?.gates.find((x) => x.id === g.id)?.detail ?? (g.detail === "Queued." ? all.checks.queued : g.detail === "Runs last." ? all.checks.runsLast : seedText(g.detail, credit.en as never, all));
  const title = applicantLabel(applicantName(c.contractorId, reference.contractors), applicantNameAr(c.contractorId, reference.contractors), locale === "ar", credit.en as never, all);
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
                <TopFactors factors={card.factors} />
                {/* One compact row per factor; why it matters, its effect on the outcome and the evidence open on demand. */}
                <ul className="divide-y divide-line" data-testid="credit-factors">
                  {card.factors.map((fa) => (
                    <li key={fa.id} id={`factor-${fa.id}`} className="scroll-mt-24 py-2.5 first:pt-0 last:pb-0">
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-start gap-2 [&::-webkit-details-marker]:hidden">
                          <span className="min-w-0 flex-1">
                            <FactorBar label={all.factors[factorKey(fa.id)].label} points={fa.points} weight={fa.weight} note={seedText(fa.rationale, credit.en as never, all)} />
                          </span>
                          <Icon name="chevron-down" className="mt-0.5 size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                          <span className="sr-only">{m.factorDetail}</span>
                        </summary>
                        <div className="mt-2 space-y-1.5 border-s-2 border-line ps-3">
                          <p className="text-xs text-ink-muted">
                            <span className="font-medium text-ink">{m.whyLabel}</span> {all.factors[factorKey(fa.id)].why}
                          </p>
                          <ImpactLine impact={impacts.find((i) => i.factorId === fa.id)} weight={fa.weight} points={fa.points} />
                          <Evidence caseId={c.id} refs={fa.evidence} docs={c.documents} />
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          )}


          {card && profile?.bank && (
            <CashflowChart profile={profile} asOf={([...c.log].reverse().find((l) => l.action === "Gated checks run (simulated)")?.at ?? c.updatedAt).slice(0, 10)} seed={c.id} documents={c.documents} />
          )}

          <Panel title={m.documentsTitle} aside={<AiLabel agent={m.documentReader} />}>
            <ul className="divide-y divide-line">
              {c.documents.map((d) => (
                <li key={d.id} className="space-y-2 py-3 first:pt-0">
                  <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Icon name="chevron-down" className="size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                      <span className="font-medium text-ink" dir={d.fileName ? "ltr" : undefined}>{d.fileName || all.documents[d.type].label}</span>
                    </span>
                    <Badge tone={d.status === "flagged" ? "negative" : d.status === "missing" ? "caution" : d.status === "verified" ? "positive" : "neutral"}>{all.documentStatus[d.status]}</Badge>
                  </summary>
                  {d.extracted.length > 0 && (
                    <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
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
                  </details>
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
          {card && (
            <Panel title={m.policyTitle}>
              <ul className="space-y-2 text-sm">
                {card.policyChecks.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-x-3 gap-y-1">
                    <span>
                      <span className="font-medium text-ink">{seedText(p.rule, credit.en as never, all)}</span>
                      <span className="block text-ink-muted">{seedText(p.observed, credit.en as never, all)}</span>
                    </span>
                    <Badge tone={POLICY[p.result]} className="shrink-0">{p.result === "pass" ? m.policyMet : p.result === "fail" ? m.policyDeclines : m.policyReview}</Badge>
                  </li>
                ))}
              </ul>
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
          {whatIfProfile && <WhatIfPanel key={c.id} caseId={c.id} profile={whatIfProfile} asOf={checksRanOn} />}

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

