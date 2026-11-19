import { describe, expect, it, vi } from "vitest";

vi.mock("@sentry/browser", () => ({ init: vi.fn(), captureException: vi.fn() }));

describe("error tracking", () => {
  it("is a no-op without a browser or DSN", async () => {
    const Sentry = await import("@sentry/browser");
    const { errorTrackingConfigured, initErrorTracking, reportError } = await import("./index");
    initErrorTracking();
    reportError(new Error("x"), { boundary: "route" });
    await Promise.resolve();
    expect(errorTrackingConfigured()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
