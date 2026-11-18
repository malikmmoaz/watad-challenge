/**
 * HTTP security headers for every route (see docs/adr/0004-browser-state-and-observability.md).
 *
 * The CSP has no nonces: pages are prerendered static, and a nonce would force
 * every page to render per request. Next's inline bootstrap scripts therefore
 * need 'unsafe-inline' for scripts. Everything else is locked to our origin
 * plus the PostHog EU hosts. Add Better Stack hosts here when #4 lands.
 */
const POSTHOG = ["https://eu.i.posthog.com", "https://eu-assets.i.posthog.com"];
/** Vercel's preview toolbar; previews only (production never loads it). */
const VERCEL_LIVE = ["https://vercel.live"];

export function contentSecurityPolicy({ dev = false, preview = false } = {}): string {
  const extra = preview ? VERCEL_LIVE : [];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), ...POSTHOG, ...extra],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...POSTHOG, ...extra],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...POSTHOG, ...extra],
    "worker-src": ["'self'", "blob:"],
    "frame-src": preview ? VERCEL_LIVE : ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const csp = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!dev) csp.push("upgrade-insecure-requests");
  return csp.join("; ");
}

export function securityHeaders(env: { dev?: boolean; preview?: boolean } = {}): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(env) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ];
}
