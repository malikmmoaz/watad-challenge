/**
 * Product analytics event catalog. Add an event here before capturing it, so
 * names stay consistent across the three role areas and the PostHog funnels
 * in docs/analytics.md keep working.
 *
 * Privacy: properties carry ids, counts and enum values only. Never send
 * company names, document contents, free text or amounts tied to a person.
 */
import type {
  CreditBand,
  CreditDecisionOutcome,
  CreditDocumentType,
  PaymentMethod,
  PaymentTerms,
  PoStatus,
  Role,
} from "@/domain/types";

/** Payment terms as one flat value for breakdowns, e.g. "platform_credit_60" or "on_delivery". */
export type TermsKey = PaymentTerms extends infer T
  ? T extends { kind: infer K extends string; days: infer D extends number }
    ? `${K}_${D}`
    : T extends { kind: infer K extends string }
      ? K
      : never
  : never;

/** Build a `TermsKey` from domain payment terms. */
export const termsKey = (t: PaymentTerms): TermsKey => ("days" in t ? `${t.kind}_${t.days}` : t.kind) as TermsKey;

export interface AnalyticsEvents {
  /** Landing page: a role card was chosen. */
  role_selected: { role: Role; source: "landing" | "switcher" };
  demo_reset: Record<string, never>;

  // Procurement funnel: RFQ -> offers -> PO
  rfq_started: { source: "upload" | "catalog" };
  rfq_parsed: { line_count: number; simulated_ai: true };
  rfq_sent: { rfq_id: string; line_count: number; invited_suppliers: number; wants_credit: boolean };
  shortlist_viewed: { rfq_id: string; supplier_count: number };
  offer_submitted: { rfq_id: string; offer_id: string; local_content: boolean; terms: TermsKey };
  offers_compared: { rfq_id: string; offer_count: number };
  offer_awarded: { rfq_id: string; offer_id: string; rank: number };
  po_placed: { po_id: string; payment_method: PaymentMethod; within_credit_cap: boolean | null };
  po_status_changed: { po_id: string; status: PoStatus };

  // Credit funnel: application -> review -> decision
  credit_application_started: Record<string, never>;
  credit_document_uploaded: { document_type: CreditDocumentType };
  credit_application_submitted: { case_id: string; document_count: number };
  credit_case_opened: { case_id: string };
  credit_evidence_opened: { case_id: string; document_type: CreditDocumentType };
  credit_memo_viewed: { case_id: string; simulated_ai: true };
  /** The simulated AI prepared the file: gates, score, band and a proposed outcome. */
  credit_checks_run: { case_id: string; band: CreditBand; proposed_outcome: CreditDecisionOutcome; provisional: boolean; simulated_ai: true };
  credit_decision_made: { case_id: string; outcome: CreditDecisionOutcome; overrode_ai: boolean };
  /** The contractor answered a request for more information. */
  credit_info_provided: { case_id: string; file_count: number; has_note: boolean };

  // Credit drawn per PO: repayment releases the cap. No amounts.
  draw_repaid: { po_id: string; repaid_before_due: boolean; tenor_days: number };

  // Explainer pages
  about_viewed: { page: string };
}

export type AnalyticsEvent = keyof AnalyticsEvents;
