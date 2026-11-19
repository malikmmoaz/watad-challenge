/**
 * Page titles and descriptions for the browser tab and link previews. Owner: Layla.
 * English feeds Next metadata (what crawlers and link unfurlers read); the
 * Arabic tab title is set on the client by LocaleSync when the reader picks Arabic.
 */
import { defineMessages } from "./core";

export const SITE_EN = "Watad challenge demo";
export const SITE_AR = "عرض تحدي وتد";

export type PageKey =
  | "home"
  | "contractor"
  | "rfqNew"
  | "rfq"
  | "contractorPo"
  | "contractorInvoice"
  | "contractorCredit"
  | "creditApply"
  | "supplier"
  | "supplierRfq"
  | "supplierPo"
  | "supplierInvoice"
  | "credit"
  | "creditCase"
  | "about"
  | "howWeBuilt"
  | "designSystem";

/** Route patterns, most specific first. */
export const PAGE_ROUTES: [pattern: RegExp, key: PageKey][] = [
  [/^\/contractor\/rfq\/new\/?$/, "rfqNew"],
  [/^\/contractor\/rfq\/[^/]+\/?$/, "rfq"],
  [/^\/contractor\/po\/[^/]+\/invoice\/?$/, "contractorInvoice"],
  [/^\/contractor\/po\/[^/]+\/?$/, "contractorPo"],
  [/^\/contractor\/credit\/apply\/?$/, "creditApply"],
  [/^\/contractor\/credit\/?$/, "contractorCredit"],
  [/^\/contractor\/?$/, "contractor"],
  [/^\/supplier\/rfq\/[^/]+\/?$/, "supplierRfq"],
  [/^\/supplier\/po\/[^/]+\/invoice\/?$/, "supplierInvoice"],
  [/^\/supplier\/po\/[^/]+\/?$/, "supplierPo"],
  [/^\/supplier\/?$/, "supplier"],
  [/^\/credit\/cases\/[^/]+\/?$/, "creditCase"],
  [/^\/credit\/?$/, "credit"],
  [/^\/about\/?$/, "about"],
  [/^\/how-we-built\/?$/, "howWeBuilt"],
  [/^\/design-system\/?$/, "designSystem"],
  [/^\/$/, "home"],
];

export const pageKeyOf = (pathname: string): PageKey | undefined => PAGE_ROUTES.find(([re]) => re.test(pathname))?.[1];

export const meta = defineMessages(
  {
    home: {
      title: "From RFQ to paid PO, with credit you can trace",
      description:
        "A neutral platform for construction materials in Saudi Arabia: suppliers compete on comparable offers, an independent credit manager sets the credit cap, and every number shows the document behind it. Sample data, simulated AI.",
    },
    contractor: { title: "Contractor workspace", description: "Open RFQs, offers to compare, purchase orders on the way and the credit cap, for a sample Riyadh contractor." },
    rfqNew: { title: "New RFQ", description: "Upload a BOQ or pick from the catalog; simulated AI reads the file and you confirm every line." },
    rfq: { title: "RFQ", description: "Shortlisted suppliers with match reasons, and offers compared on landed cost, lead time, terms and reliability." },
    contractorInvoice: { title: "Tax invoice", description: "Simplified tax invoice with the ZATCA Phase 1 QR code. Sample: not submitted to ZATCA." },
    contractorPo: { title: "Purchase order", description: "Purchase order status from issue to payment, with the credit draw and Murabaha markup shown with its APR." },
    contractorCredit: { title: "Credit · Contractor", description: "The credit cap, draws per PO and the status of credit applications." },
    creditApply: { title: "Apply for credit · Contractor", description: "Apply for a credit cap with Saudi documents: CR, ZATCA VAT returns, Zakat, bank statements, GOSI and more." },
    supplier: { title: "Supplier portal", description: "Requests matched to a sample supplier, why each one matched, and purchase orders to fulfil." },
    supplierRfq: { title: "Request for quotation", description: "One request, the same for every invited supplier: lines, delivery, preferred terms, and the offer form." },
    supplierInvoice: { title: "Tax invoice · Supplier", description: "Your simplified tax invoice with the ZATCA Phase 1 QR code. Sample: not submitted to ZATCA." },
    supplierPo: { title: "Purchase order · Supplier", description: "Accept, dispatch and invoice a purchase order; paid directly from the contractor's credit cap." },
    credit: { title: "Credit manager workspace", description: "The independent credit manager's queue of applications, with gated checks, scores and decisions." },
    creditCase: { title: "Credit case · Credit manager", description: "Gated checks, evidence-linked scorecard, AI-drafted memo and a decision a named person signs." },
    about: { title: "About", description: "The business model, priorities, stack, AI use and assumptions behind this demo." },
    howWeBuilt: { title: "How we built it", description: "Six Claude Code agents with one role each, directed by one human, built this in 24 hours." },
    designSystem: { title: "Design system", description: "Tokens, type and the shared components every screen is built from." },
  },
  {
    home: {
      title: "من طلب عروض الأسعار إلى أمر شراء مدفوع، بائتمانٍ تعرف مصدره",
      description:
        "منصة محايدة لمواد البناء في السعودية: يتنافس الموردون بعروض قابلة للمقارنة، ويضع مدير ائتمان مستقل الحد الائتماني، وكل رقم يدلّك على المستند الذي جاء منه. بيانات تجريبية وذكاء اصطناعي محاكى.",
    },
    contractor: { title: "مساحة عمل المقاول", description: "الطلبات المفتوحة والعروض للمقارنة وأوامر الشراء قيد التنفيذ والحد الائتماني لمقاول تجريبي في الرياض." },
    rfqNew: { title: "طلب عروض أسعار جديد", description: "ارفع جدول الكميات أو اختر من الكتالوج؛ يقرأ الذكاء الاصطناعي المحاكى الملف وتؤكّد أنت كل بند." },
    rfq: { title: "طلب عروض أسعار", description: "الموردون المرشحون مع أسباب الترشيح، والعروض مقارنة بالتكلفة الواصلة ومدة التوريد والشروط والموثوقية." },
    contractorInvoice: { title: "فاتورة ضريبية", description: "فاتورة ضريبية مبسطة مع رمز QR للمرحلة الأولى من الفوترة الإلكترونية. نموذج: لم تُرسل إلى الهيئة." },
    contractorPo: { title: "أمر الشراء", description: "حالة أمر الشراء من الإصدار حتى الدفع، مع السحب من الائتمان وربح المرابحة ونسبته السنوية." },
    contractorCredit: { title: "الائتمان · المقاول", description: "الحد الائتماني والسحب لكل أمر شراء وحالة طلبات الائتمان." },
    creditApply: { title: "طلب ائتمان · المقاول", description: "قدّم طلب حد ائتماني بالمستندات السعودية: السجل التجاري وإقرارات زاتكا والزكاة وكشوف الحساب والتأمينات الاجتماعية وغيرها." },
    supplier: { title: "بوابة المورّد", description: "الطلبات المطابقة لمورّد تجريبي وسبب ترشيحه لكل منها، وأوامر الشراء المطلوب تنفيذها." },
    supplierRfq: { title: "طلب عروض أسعار", description: "طلب واحد يراه كل مورّد مدعو بالصيغة نفسها: البنود والتسليم وشروط الدفع المفضلة ونموذج العرض." },
    supplierInvoice: { title: "فاتورة ضريبية · المورّد", description: "فاتورتك الضريبية المبسطة مع رمز QR للمرحلة الأولى من الفوترة الإلكترونية. نموذج: لم تُرسل إلى الهيئة." },
    supplierPo: { title: "أمر الشراء · المورّد", description: "اقبل أمر الشراء واشحنه وأصدر فاتورته؛ يُدفع لك مباشرةً من الحد الائتماني للمقاول." },
    credit: { title: "مساحة عمل مدير الائتمان", description: "قائمة طلبات الائتمان لدى مدير الائتمان المستقل، مع الفحوص المتدرجة والدرجات والقرارات." },
    creditCase: { title: "ملف ائتماني · مدير الائتمان", description: "فحوص متدرجة وبطاقة تقييم مرتبطة بالمستندات ومذكرة يصوغها الذكاء الاصطناعي وقرار يوقّعه شخص مسمّى." },
    about: { title: "عن العرض", description: "نموذج العمل والأولويات والتقنيات واستخدام الذكاء الاصطناعي والافتراضات وراء هذا العرض." },
    howWeBuilt: { title: "كيف بنيناه", description: "ستة وكلاء Claude Code، لكلٍّ منهم دور واحد، يوجّههم إنسان واحد، بنوا هذا العرض في 24 ساعة." },
    designSystem: { title: "نظام التصميم", description: "الرموز والخطوط والمكونات المشتركة التي بُنيت منها كل الشاشات." },
  },
);

export const SHARE_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "Watad challenge demo: From RFQ to paid PO, with credit you can trace. Contractor, supplier and independent credit manager. Sample data, simulated AI.",
};

/**
 * Next metadata for a page, from the English side. Next replaces a parent's
 * openGraph and twitter objects rather than merging them, so each page carries
 * the full set: site name, locales, the share card and the large Twitter card.
 */
export function pageMetadata(key: PageKey) {
  const { title, description } = meta.en[key];
  return {
    // Absolute: the role layouts set their own title, which would stop the root template applying below them.
    title: { absolute: `${title} · ${SITE_EN}` },
    description,
    openGraph: { type: "website" as const, siteName: SITE_EN, locale: "en_US", alternateLocale: ["ar_SA"], title, description, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image" as const, title, description, images: [SHARE_IMAGE] },
  };
}
