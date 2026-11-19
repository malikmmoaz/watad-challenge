import { describe, expect, it } from "vitest";
import { credit } from "@/i18n/credit";
import { logAction, logDetail } from "./log-text";
import { seedText } from "./data-text";

const ar = credit.ar;
const en = credit.en as never;

describe("stored credit text in Arabic", () => {
  it("translates known log actions and details", () => {
    expect(logAction("Gated checks run (simulated)", ar)).toBe(ar.log.checksRun);
    expect(logDetail("4 pass, 1 flag", ar)).toBe("ناجح 4، ملاحظة 1، غير ناجح 0");
    expect(logDetail("5 pass, 0 flag, 0 fail, 1 not run", ar)).toContain("لم يُجرَ 1");
    expect(logDetail("7 of 8 documents uploaded", ar)).toBe("مستندات مرفوعة: 7 من 8");
    expect(logDetail("3 documents flagged", ar)).toBe("3 مستندات عليها ملاحظات");
    expect(logDetail("Something a person wrote", ar)).toBe("Something a person wrote");
  });

  it("translates every hand-written seed sentence and leaves English unchanged in English", () => {
    for (const text of Object.values(credit.en.data.seed)) {
      expect(seedText(text, en, ar), text).toMatch(/[؀-ۿ]/);
      expect(seedText(text, en, credit.en as never)).toBe(text);
    }
  });
});
