"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";
import { StatusPage } from "@/components/system/status-page";
import { common } from "@/i18n/common";
import { useMessages } from "@/i18n/locale";
import { captureError } from "@/lib/analytics";
import { resetDemo } from "@/store";

const digestOf = (e: unknown): string | undefined =>
  typeof e === "object" && e !== null && "digest" in e && typeof e.digest === "string" ? e.digest : undefined;

/** Route-level error boundary: everything below the root layout. */
export default function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  const m = useMessages(common);
  useEffect(() => {
    captureError(error, "route", digestOf(error));
  }, [error]);

  return (
    <StatusPage
      code={m.system.errorCode}
      title={m.system.errorTitle}
      testId="route-error"
      action={
        <>
          <Button variant="primary" onClick={() => retry()}>
            {m.system.tryAgain}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              resetDemo();
              retry();
            }}
          >
            {m.system.resetAndTryAgain}
          </Button>
        </>
      }
    >
      {m.system.errorBody}
    </StatusPage>
  );
}
