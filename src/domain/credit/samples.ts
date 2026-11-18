import type { CreditProfile, DocKey } from './types';

/**
 * SAMPLE DATA. Fictional companies, registration numbers and figures, written to
 * resemble Saudi contractors. Not real businesses and not real credit data.
 */
export const SAMPLE_AS_OF = '2026-11-18';

const ALL_DOCS: DocKey[] = [
  'cr',
  'vat_returns',
  'zakat_certificate',
  'simah_report',
  'financials_qawaem',
  'bank_statements',
  'gosi_certificate',
  'contractor_classification',
  'contracts_in_hand',
];

/** Strong approve: government-backed backlog, clean SIMAH, comfortable liquidity. */
export const rawasiNajd: CreditProfile = {
  id: 'CA-2026-0041',
  applicant: {
    name: 'Rawasi Najd Contracting Co. (sample)',
    city: 'Riyadh',
    crNumber: '1010-SAMPLE-41',
    yearsTrading: 14,
    classificationGrade: 2,
  },
  request: { capSar: 1_000_000, tenorDays: 60 },
  monthlyPurchasesSar: 1_800_000,
  documentsProvided: ALL_DOCS,
  tamperFlags: [],
  cr: { status: 'active', expiresOn: '2028-03-14' },
  vat: { registered: true, annualRevenueSar: 47_600_000, lateFilings: 0 },
  zakat: { validUntil: '2027-04-30' },
  gosi: { validUntil: '2026-12-31' },
  bank: {
    monthsProvided: 12,
    annualInflowsSar: 54_900_000,
    avgBalanceSar: 3_200_000,
    returnedCheques: 0,
    negativeBalanceDays: 0,
    inflowVolatility: 0.25,
  },
  financials: {
    audited: true,
    revenueSar: 48_000_000,
    netProfitSar: 4_100_000,
    currentAssetsSar: 21_000_000,
    currentLiabilitiesSar: 11_000_000,
    totalLiabilitiesSar: 14_000_000,
    netWorthSar: 16_000_000,
  },
  simah: { consent: true, report: { score: 790, unsettledDefaultSar: 0, delinquencies12m: 0 } },
  platform: { ordersPaid: 12, avgDaysLate: 0 },
  contracts: [
    { payer: 'Ministry school-building programme', payerType: 'government', valueSar: 38_000_000, remainingSar: 22_000_000, retentionPct: 10, percentComplete: 42, billedPct: 40, overdueReceivableSar: 700_000 },
    { payer: 'Regional development authority', payerType: 'semi_government', valueSar: 21_000_000, remainingSar: 14_000_000, retentionPct: 10, percentComplete: 33, billedPct: 30, overdueReceivableSar: 500_000 },
    { payer: 'Listed residential developer', payerType: 'listed', valueSar: 15_000_000, remainingSar: 9_000_000, retentionPct: 5, percentComplete: 40, billedPct: 36, overdueReceivableSar: 0 },
  ],
  openLegalCases: 0,
};

/** Approve with conditions: sound but thinner, and dependent on one private developer. */
export const durratAlQassim: CreditProfile = {
  id: 'CA-2026-0042',
  applicant: {
    name: 'Durrat Al-Qassim Building Est. (sample)',
    city: 'Buraydah',
    crNumber: '1131-SAMPLE-42',
    yearsTrading: 6,
    classificationGrade: 4,
  },
  request: { capSar: 250_000, tenorDays: 90 },
  monthlyPurchasesSar: 600_000,
  documentsProvided: ALL_DOCS,
  tamperFlags: [],
  cr: { status: 'active', expiresOn: '2027-08-02' },
  vat: { registered: true, annualRevenueSar: 12_200_000, lateFilings: 1 },
  zakat: { validUntil: '2027-04-30' },
  gosi: { validUntil: '2026-12-15' },
  bank: {
    monthsProvided: 12,
    annualInflowsSar: 14_300_000,
    avgBalanceSar: 600_000,
    returnedCheques: 1,
    negativeBalanceDays: 2,
    inflowVolatility: 0.4,
  },
  financials: {
    audited: true,
    revenueSar: 12_500_000,
    netProfitSar: 500_000,
    currentAssetsSar: 6_400_000,
    currentLiabilitiesSar: 4_000_000,
    totalLiabilitiesSar: 5_500_000,
    netWorthSar: 3_000_000,
  },
  simah: { consent: true, report: { score: 720, unsettledDefaultSar: 0, delinquencies12m: 0 } },
  platform: null,
  contracts: [
    { payer: 'Private villa-compound developer', payerType: 'large_private', valueSar: 11_000_000, remainingSar: 7_000_000, retentionPct: 10, percentComplete: 36, billedPct: 28, overdueReceivableSar: 700_000 },
    { payer: 'Local retail fit-out client', payerType: 'sme', valueSar: 3_200_000, remainingSar: 2_000_000, retentionPct: 5, percentComplete: 38, billedPct: 30, overdueReceivableSar: 200_000 },
  ],
  openLegalCases: 0,
};

/** Refer: reported revenue far above VAT-declared revenue, GOSI expired, one tamper flag. */
export const sahelAlSharq: CreditProfile = {
  id: 'CA-2026-0043',
  applicant: {
    name: 'Sahel Al-Sharq Contracting Co. (sample)',
    city: 'Dammam',
    crNumber: '2050-SAMPLE-43',
    yearsTrading: 8,
    classificationGrade: 3,
  },
  request: { capSar: 400_000, tenorDays: 60 },
  monthlyPurchasesSar: 500_000,
  documentsProvided: ALL_DOCS.filter((d) => d !== 'simah_report'),
  tamperFlags: [
    { doc: 'financials_qawaem', note: 'Revenue line on the income statement uses a different font and does not match the Qawaem filing reference.' },
  ],
  cr: { status: 'active', expiresOn: '2027-01-20' },
  vat: { registered: true, annualRevenueSar: 8_000_000, lateFilings: 0 },
  zakat: { validUntil: '2027-04-30' },
  gosi: { validUntil: '2026-09-30' },
  bank: {
    monthsProvided: 9,
    annualInflowsSar: 9_400_000,
    avgBalanceSar: 450_000,
    returnedCheques: 0,
    negativeBalanceDays: 4,
    inflowVolatility: 0.45,
  },
  financials: {
    audited: true,
    revenueSar: 11_900_000,
    netProfitSar: 900_000,
    currentAssetsSar: 5_100_000,
    currentLiabilitiesSar: 3_300_000,
    totalLiabilitiesSar: 4_200_000,
    netWorthSar: 3_400_000,
  },
  simah: { consent: true, report: null },
  platform: null,
  contracts: [
    { payer: 'Industrial city operator', payerType: 'semi_government', valueSar: 6_500_000, remainingSar: 4_000_000, retentionPct: 10, percentComplete: 38, billedPct: 35, overdueReceivableSar: 300_000 },
    { payer: 'Private logistics warehouse owner', payerType: 'large_private', valueSar: 4_000_000, remainingSar: 3_000_000, retentionPct: 5, percentComplete: 25, billedPct: 20, overdueReceivableSar: 0 },
  ],
  openLegalCases: 0,
};

/** Decline: unsettled SIMAH default, returned cheques, negative working capital. */
export const bunyanAlHijaz: CreditProfile = {
  id: 'CA-2026-0044',
  applicant: {
    name: 'Bunyan Al-Hijaz Est. (sample)',
    city: 'Jeddah',
    crNumber: '4030-SAMPLE-44',
    yearsTrading: 3,
    classificationGrade: null,
  },
  request: { capSar: 300_000, tenorDays: 90 },
  monthlyPurchasesSar: 350_000,
  documentsProvided: ALL_DOCS.filter((d) => d !== 'contractor_classification'),
  tamperFlags: [],
  cr: { status: 'active', expiresOn: '2027-05-11' },
  vat: { registered: true, annualRevenueSar: 6_100_000, lateFilings: 3 },
  zakat: { validUntil: '2027-04-30' },
  gosi: { validUntil: '2026-12-31' },
  bank: {
    monthsProvided: 12,
    annualInflowsSar: 7_100_000,
    avgBalanceSar: 60_000,
    returnedCheques: 4,
    negativeBalanceDays: 38,
    inflowVolatility: 0.85,
  },
  financials: {
    audited: false,
    revenueSar: 6_200_000,
    netProfitSar: -400_000,
    currentAssetsSar: 2_100_000,
    currentLiabilitiesSar: 2_900_000,
    totalLiabilitiesSar: 3_600_000,
    netWorthSar: 900_000,
  },
  simah: { consent: true, report: { score: 520, unsettledDefaultSar: 310_000, delinquencies12m: 3 } },
  platform: null,
  contracts: [
    { payer: 'Private apartment-block owner', payerType: 'individual', valueSar: 2_600_000, remainingSar: 1_100_000, retentionPct: 10, percentComplete: 58, billedPct: 35, overdueReceivableSar: 900_000 },
  ],
  openLegalCases: 2,
};

export const SAMPLE_CASES: CreditProfile[] = [rawasiNajd, durratAlQassim, sahelAlSharq, bunyanAlHijaz];
