import type { DocKey } from './types';

export interface DocumentRequirement {
  key: DocKey;
  label: string;
  /** One line shown to the contractor: why the credit manager asks for this. */
  whyItMatters: string;
  required: boolean;
}

export const DOCUMENT_REQUIREMENTS: readonly DocumentRequirement[] = [
  { key: 'cr', label: 'Commercial Registration (CR)', whyItMatters: 'Proves the company exists, is active and is licensed for contracting.', required: true },
  { key: 'vat_returns', label: 'ZATCA VAT returns (last 4 quarters)', whyItMatters: 'Confirm the revenue you declared to ZATCA, the anchor every other figure is compared with.', required: true },
  { key: 'zakat_certificate', label: 'Zakat certificate', whyItMatters: 'Shows you are in good standing with ZATCA, which government clients require before paying you.', required: true },
  { key: 'simah_report', label: 'SIMAH consent', whyItMatters: 'Lets us see how existing lenders and suppliers have been repaid. Pulled last, only if the other checks pass.', required: true },
  { key: 'financials_qawaem', label: 'Audited financial statements (Qawaem)', whyItMatters: 'Net worth and working capital set the size of the credit cap.', required: true },
  { key: 'bank_statements', label: 'Bank statements (6 to 12 months)', whyItMatters: 'Show real cash coming in and going out, and confirm the revenue in your VAT returns.', required: true },
  { key: 'gosi_certificate', label: 'GOSI certificate', whyItMatters: 'Confirms your headcount and payroll are real and up to date.', required: true },
  { key: 'contractor_classification', label: 'Contractor classification certificate', whyItMatters: 'Shows the size of project you are officially graded to deliver.', required: false },
  { key: 'contracts_in_hand', label: 'Contracts in hand (payer, value, retention)', whyItMatters: 'Show where repayment will come from and who is paying.', required: true },
];
