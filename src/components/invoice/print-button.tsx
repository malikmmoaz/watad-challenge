"use client";

import { invoice } from "@/i18n/invoice";
import { useMessages } from "@/i18n/locale";
import { buttonClass } from "../ui";

/** Opens the browser's print dialog; "Save as PDF" is a destination there. Hidden on paper. */
export function PrintButton({ testId = "print" }: { testId?: string }) {
  const m = useMessages(invoice);
  return (
    <button type="button" data-testid={testId} onClick={() => window.print()} className={buttonClass("secondary", "sm", "print:hidden")}>
      {m.print}
    </button>
  );
}
