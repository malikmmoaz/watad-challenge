import { describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({ default: { init: vi.fn(), capture: vi.fn(), register: vi.fn() } }));

describe("analytics", () => {
  it("is a no-op without a browser or project key", async () => {
    const posthog = (await import("posthog-js")).default;
    const { analyticsEnabled, initAnalytics, setRole, track } = await import("./index");
    initAnalytics();
    track("role_selected", { role: "contractor", source: "landing" });
    setRole("credit");
    expect(analyticsEnabled()).toBe(false);
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});

describe("termsKey", () => {
  it("flattens payment terms for breakdowns", async () => {
    const { termsKey } = await import("./events");
    expect(termsKey({ kind: "platform_credit", days: 60 })).toBe("platform_credit_60");
    expect(termsKey({ kind: "on_delivery" })).toBe("on_delivery");
  });
});

describe("unreadBucket", () => {
  it("buckets the unread count instead of sending it exactly", async () => {
    const { unreadBucket } = await import("./events");
    expect([0, 1, 2, 5, 6, 40].map(unreadBucket)).toEqual(["0", "1", "2-5", "2-5", "6+", "6+"]);
  });
});
