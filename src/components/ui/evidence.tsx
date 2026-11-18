import type { ReactNode } from "react";
import { cx } from "./cx";

function SealMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px shrink-0 -rotate-6">
      <circle cx="8" cy="8" r="6.6" strokeWidth="1" strokeDasharray="1.1 1.5" />
      <circle cx="8" cy="8" r="4.5" strokeWidth="1.25" />
      <path d="M6 8.2l1.4 1.4L10.1 6.6" strokeWidth="1.4" />
    </svg>
  );
}

/**
 * The attestation seal: marks a value that a document backs, and opens that
 * document. Use it beside every figure a credit manager might question.
 * `source` names the document and place: "ZATCA VAT return Q3 2026, box 6".
 */
export function EvidenceSeal({ source, href, onOpen, className }: { source: string; href?: string; onOpen?: () => void; className?: string }) {
  const cls = cx(
    "inline-flex max-w-full items-start gap-1.5 rounded-sm text-left text-xs font-medium text-stamp underline decoration-stamp/35 underline-offset-[3px] transition-colors duration-150 hover:text-stamp-hover hover:decoration-stamp",
    className,
  );
  const body = (
    <>
      <SealMark />
      <span>{source}</span>
    </>
  );
  return href ? (
    <a href={href} className={cls} title={`Open source: ${source}`}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={onOpen} className={cls} title={`Open source: ${source}`}>
      {body}
    </button>
  );
}

/** A value that nothing on file supports yet. Never styled as a seal. */
export function NoEvidence({ children = "No document on file" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 text-xs text-caution">{children}</span>;
}

type Decision = "approved" | "referred" | "declined";
/** The domain's `CreditDecisionOutcome` values are accepted as they are. */
type DecisionInput = Decision | "approve" | "request_info" | "decline";
const fromOutcome: Record<DecisionInput, Decision> = {
  approved: "approved",
  referred: "referred",
  declined: "declined",
  approve: "approved",
  request_info: "referred",
  decline: "declined",
};
const decisionStyle: Record<Decision, { word: string; cls: string }> = {
  approved: { word: "Approved", cls: "border-positive text-positive" },
  referred: { word: "More information requested", cls: "border-caution text-caution" },
  declined: { word: "Declined", cls: "border-negative text-negative" },
};

/**
 * A human decision, printed like a stamp in the decision log. Only for
 * decisions a named person made; AI proposals use AiLabel and plain text.
 */
export function DecisionStamp({ decision, by, at, animate = false }: { decision: DecisionInput; by: string; at: string; animate?: boolean }) {
  const d = decisionStyle[fromOutcome[decision]];
  return (
    <div className={cx("inline-flex -rotate-2 flex-col rounded-md border-2 px-3 py-1.5 outline outline-1 -outline-offset-4 outline-current/40", d.cls, animate && "motion-safe:animate-[seal-press_240ms_var(--ease-out)_both]")}>
      <span className="whitespace-nowrap text-sm font-bold uppercase tracking-wide">{d.word}</span>
      <span className="whitespace-nowrap text-xs font-medium">
        {by} · {at}
      </span>
    </div>
  );
}
