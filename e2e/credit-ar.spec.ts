import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect, tid, expectNoHorizontalScroll } from "./fixtures";

// The credit journey in Arabic, right to left (ADR 0005): application, manager review and
// decision, and the contractor's answer. Same test ids as English; Sharia-compliant wording.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("watad-locale", "ar"));
});

const ready = async (page: Page) => {
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).not.toHaveClass(/i18n-pending/);
};

const noInterest = async (page: Page) => expect(await page.locator("main").innerText()).not.toContain("فائدة");

test("contractor credit page in Arabic: figures, Murabaha wording, no sideways scroll", async ({ page }) => {
  await page.goto("/contractor/credit");
  await ready(page);
  await expect(tid(page, "credit-figures")).toContainText("المتبقي من الحد الائتماني");
  await expect(tid(page, "credit-facility")).toContainText("هامش ربح المرابحة");
  await expect(tid(page, "credit-facility")).toContainText("معدل النسبة السنوي");
  await expect(tid(page, "credit-draws")).toContainText("الائتمان المسحوب على أوامر الشراء");
  await expect(tid(page, "credit-case-cc_501").getByTestId("credit-tracker-status")).toHaveText("تمت الموافقة");
  await noInterest(page);
  await expectNoHorizontalScroll(page);
});

test("apply, request more information, answer it and approve, all in Arabic", async ({ page }) => {
  test.slow();
  await page.goto("/contractor/credit/apply");
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("تقديم طلب حد ائتماني");
  await expect(tid(page, "credit-doc-simah_report")).toContainText("تقرير سمة");
  await expect(tid(page, "credit-doc-gosi_certificate")).toContainText("التأمينات الاجتماعية");
  await tid(page, "credit-apply-submit").click();
  await expect(tid(page, "credit-apply-form")).toContainText("الموافقة على تقرير سمة مطلوبة");
  await tid(page, "credit-apply-cap").fill("2000000");
  await tid(page, "credit-apply-purpose").fill("حديد تسليح وخرسانة جاهزة لمجمّع مدارس النرجس");
  await tid(page, "credit-apply-sample-docs").click();
  await tid(page, "credit-apply-simah-consent").check();
  await tid(page, "credit-apply-declaration").check();
  await tid(page, "credit-apply-submit").click();
  await expect(page).toHaveURL(/\/contractor\/credit#(cc_\w+)$/);
  const caseId = new URL(page.url()).hash.slice(1);
  await expect(tid(page, "credit-submitted")).toContainText("تم تقديم الطلب");

  // Credit manager: queue, checks, scorecard, memo, decision.
  await page.goto("/credit");
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("طلبات الائتمان");
  await tid(page, `credit-queue-row-${caseId}`).getByRole("link").click();
  await expect(tid(page, "credit-run-checks")).toContainText("محاكاة بالذكاء الاصطناعي");
  await tid(page, "credit-run-checks").click();
  await expect(tid(page, "credit-decision-form")).toBeVisible();
  await expect(tid(page, "credit-gates")).toContainText("السجل التجاري");
  const factors = tid(page, "credit-factors").locator(":scope > li");
  await expect(factors).toHaveCount(10);
  await expect(factors.first()).toContainText("السيولة");
  await expect(factors.first()).toContainText("أهميته:");
  await expect(factors.first().getByTestId("credit-factor-impact")).toContainText("الأثر:");
  await expect(tid(page, "credit-ai-memo")).toContainText("التوصية");
  await expect(tid(page, "credit-ai-memo")).toContainText("محاكاة بالذكاء الاصطناعي");
  await noInterest(page);
  await expectNoHorizontalScroll(page);

  await tid(page, "credit-outcome-request_info").check({ force: true });
  await tid(page, "credit-decision-submit").click();
  await expect(tid(page, "credit-decision-form")).toContainText("اكتب السبب الذي سيقرؤه المقاول");
  await tid(page, "credit-decision-items").fill("كشوف الحساب الثاني لآخر ستة أشهر");
  await tid(page, "credit-decision-reason").fill("نحتاج كشوف الحساب الثاني لمطابقة الإيرادات المصرّح بها ضريبيًا.");
  const override = tid(page, "credit-decision-override");
  if (await override.count()) await override.fill("قرار مدير الائتمان بعد مراجعة الكشوف.");
  await tid(page, "credit-decision-submit").click();
  await expect(tid(page, "credit-case-status")).toHaveText("طلب معلومات إضافية");
  await expect(tid(page, "credit-decision")).toContainText("معلومات إضافية");

  // Contractor answers in Arabic; the case returns to the manager.
  await page.goto("/contractor/credit");
  const card = tid(page, `credit-case-${caseId}`);
  await expect(card.getByTestId("credit-more-info")).toContainText("يحتاج مدير الائتمان إلى معلومات إضافية");
  await card.locator("textarea").fill("أرفقنا كشوف الحساب الثاني.");
  await card.getByTestId("credit-more-info-send").click();
  await expect(card.getByTestId("credit-more-info-sent")).toContainText("أُرسل إلى مدير الائتمان");

  await page.goto(`/credit/cases/${caseId}`);
  await expect(tid(page, "credit-decision-log")).toContainText("قُدّمت المعلومات الإضافية");
  await tid(page, "credit-run-checks").click();
  await tid(page, "credit-outcome-approve").check({ force: true });
  await tid(page, "credit-decision-reason").fill("سيولة جيدة ومشاريع حكومية؛ الحد عند المقترح.");
  const override2 = tid(page, "credit-decision-override");
  if (await override2.count()) await override2.fill("الملف مكتمل الآن.");
  await tid(page, "credit-decision-submit").click();
  await expect(tid(page, "credit-case-status")).toHaveAttribute("data-status", "approved");
  await expect(tid(page, "credit-decision")).toContainText("الحد الائتماني");
});

test("Arabic credit pages have no serious or critical accessibility issues", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/contractor/credit", "/contractor/credit/apply", "/credit", "/credit/cases/cc_502"]) {
    await page.goto(path);
    await ready(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude("[hidden]").analyze();
    const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`);
    expect(blocking, `serious/critical a11y issues on ${path} (ar)`).toEqual([]);
  }
});
