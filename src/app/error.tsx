"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";
import { StatusPage } from "@/components/system/status-page";
import { captureError } from "@/lib/analytics";
import { resetDemo } from "@/store";

const digestOf = (e: unknown): string | undefined =>
  typeof e === "object" && e !== null && "digest" in e && typeof e.digest === "string" ? e.digest : undefined;

/** Route-level error boundary: everything below the root layout. */
export default function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    captureError(error, "route", digestOf(error));
  }, [error]);

  return (
    <StatusPage
      code="Error"
      title="Something went wrong on this page"
      testId="route-error"
      action={
        <>
          <Button variant="primary" onClick={() => retry()}>
            Try again
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              resetDemo();
              retry();
            }}
          >
            Reset demo data and try again
          </Button>
        </>
      }
    >
      The error has been reported. If it keeps happening, the demo data saved in this browser may be out of date: resetting it restores the
      sample data and keeps nothing else.
    </StatusPage>
  );
}
