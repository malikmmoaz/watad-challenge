import { test as base, type Locator, type Page } from "@playwright/test";
import { tour } from "@/content/tour";

/** Demo fixture: hides the reviewer guide panel so the journey fills the frame. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    // Follows the guide version, so a new tour version still records without the panel.
    await page.addInitScript((key) => window.localStorage.setItem(key, "1"), tour.storageKey);
    await provide(page);
  },
});

export const tid = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true }).first();

/** A beat for the viewer to read the screen. */
export const beat = (page: Page, ms = 900) => page.waitForTimeout(ms);

/** Bring an element to the middle of the screen, smoothly. */
export async function show(page: Page, target: Locator, ms = 900) {
  await target.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await beat(page, ms);
}

/** Outline the control, then click it, so viewers see what was pressed. */
export async function press(page: Page, target: Locator, ms = 500) {
  await target.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await beat(page, 350);
  await target.evaluate((el) => {
    const h = el as HTMLElement;
    h.dataset.demoOutline = h.style.outline;
    h.style.outline = "3px solid #e07a1f";
    h.style.outlineOffset = "3px";
  });
  await beat(page, ms);
  await target.evaluate((el) => {
    const h = el as HTMLElement;
    h.style.outline = h.dataset.demoOutline ?? "";
  }).catch(() => {});
  await target.click();
}

/** Type like a person, so the video shows the field filling in. */
export async function type(page: Page, target: Locator, text: string) {
  await target.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await target.click();
  await target.fill("");
  await target.pressSequentially(text, { delay: 30 });
  await beat(page, 300);
}
