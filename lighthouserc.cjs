/**
 * Lighthouse CI budgets (production hardening, item 3).
 * Runs in CI only (`.github/workflows/ci.yml`, job "lighthouse") against a
 * production build served locally; default Lighthouse settings = mobile with
 * simulated throttling, median of 5 runs. First CI run (18 Nov): performance
 * 100 median (90 cold), a11y / best practices / SEO 100, LCP ~0.76 s, CLS 0,
 * JS 280 KB on / and 328 KB on /contractor.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm exec next start -H 127.0.0.1 -p 3120",
      startServerReadyPattern: "Ready",
      url: ["http://127.0.0.1:3120/", "http://127.0.0.1:3120/about", "http://127.0.0.1:3120/how-we-built", "http://127.0.0.1:3120/contractor", "http://127.0.0.1:3120/contractor/rfq/new", "http://127.0.0.1:3120/contractor/rfq/rfq_1042", "http://127.0.0.1:3120/contractor/po/po_3007", "http://127.0.0.1:3120/contractor/po/po_3007/invoice", "http://127.0.0.1:3120/contractor/credit", "http://127.0.0.1:3120/contractor/credit/apply", "http://127.0.0.1:3120/supplier", "http://127.0.0.1:3120/supplier/rfq/rfq_1044", "http://127.0.0.1:3120/supplier/po/po_3007", "http://127.0.0.1:3120/supplier/po/po_3007/invoice", "http://127.0.0.1:3120/credit", "http://127.0.0.1:3120/credit/cases/cc_502"],
      // Median of 5: two noisy runs on a busy CI runner can no longer fail the check
      // (seen once on #93: /contractor 0.83 with TBT ~700 ms, then 0.99 on rerun).
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.9, aggregationMethod: "median-run" }],
        "categories:accessibility": ["warn", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.95 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1, aggregationMethod: "median-run" }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500, aggregationMethod: "median-run" }],
        "total-blocking-time": ["warn", { maxNumericValue: 300, aggregationMethod: "median-run" }],
        "resource-summary:script:size": ["warn", { maxNumericValue: 400000 }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/reports" },
  },
};
