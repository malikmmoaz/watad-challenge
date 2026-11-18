import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("security headers", () => {
  it("allows PostHog EU and Better Stack ingest, nothing else off-origin, in production", () => {
    const csp = contentSecurityPolicy();
    expect(directive(csp, "connect-src")).toBe("connect-src 'self' https://eu.i.posthog.com https://eu-assets.i.posthog.com https://*.betterstackdata.com");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("vercel.live");
    expect(csp).toContain("upgrade-insecure-requests");
  });
  it("adds eval only in dev and the Vercel toolbar only on previews", () => {
    expect(directive(contentSecurityPolicy({ dev: true }), "script-src")).toContain("'unsafe-eval'");
    expect(directive(contentSecurityPolicy({ preview: true }), "frame-src")).toBe("frame-src https://vercel.live");
  });
  it("upgrades insecure requests everywhere except a local http build", () => {
    expect(contentSecurityPolicy({ preview: true })).toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy({ local: true })).not.toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy({ local: true })).toContain("default-src 'self'");
  });
  it("sends the full header set", () => {
    expect(securityHeaders().map((h) => h.key)).toEqual([
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Strict-Transport-Security",
    ]);
  });
});
