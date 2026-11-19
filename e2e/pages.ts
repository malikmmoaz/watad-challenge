/** The pages every accessibility and locale check visits: each role's home, the explanation pages and the main journey forms. */
export const PAGES = [
  { name: "landing", path: "/" },
  { name: "contractor home", path: "/contractor" },
  { name: "supplier home", path: "/supplier" },
  { name: "credit manager queue", path: "/credit" },
  { name: "about", path: "/about" },
  { name: "how we built it", path: "/how-we-built" },
  // Journey pages: the forms and tables a reviewer works through.
  { name: "new RFQ form", path: "/contractor/rfq/new" },
  { name: "offer comparison", path: "/contractor/rfq/rfq_1042" },
  { name: "credit application", path: "/contractor/credit/apply" },
  { name: "supplier offer form", path: "/supplier/rfq/rfq_1044" },
  { name: "credit case file", path: "/credit/cases/cc_502" },
];
