"use client";

import { common } from "@/i18n/common";
import { useMessages } from "@/i18n/locale";
import { track } from "@/lib/analytics";
import { resetDemo } from "@/store";

/** In the app bar: restores the seeded sample data. */
export function ResetDemoButton() {
  const m = useMessages(common);
  return (
    <button
      type="button"
      onClick={() => {
        resetDemo();
        track("demo_reset", {});
      }}
      className="flex h-8 items-center whitespace-nowrap rounded-full border border-line-control bg-surface px-2.5 text-xs sm:px-3 font-medium text-ink shadow-card transition-colors duration-150 hover:bg-paper"
    >
      <span className="sm:hidden">{m.appBar.reset}</span>
      <span className="hidden sm:inline">{m.appBar.resetDemo}</span>
    </button>
  );
}
