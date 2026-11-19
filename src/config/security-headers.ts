/**
 * HTTP security headers for every route (see docs/adr/0004-browser-state-and-observability.md).
 *
 * The CSP has no nonces: pages are prerendered static, and a nonce would force
 * every page to render per request. Next's inline bootstrap scripts therefore
 * need 'unsafe-inline' for scripts. Everything else is locked to our origin
 * plus the PostHog EU hosts and Better Stack's error ingest (#4).
 */
const POSTHOG = ["https://eu.i.posthog.com", "https://eu-assets.i.posthog.com"];
/** Better Stack error tracking ingest (Sentry-compatible), per-app subdomain. */
const BETTER_STACK = ["https://*.betterstackdata.com"];
/** Vercel's preview toolbar; previews only (production never loads it). */
const VERCEL_LIVE = ["https://vercel.live"];

/**
 * `local`: a production build served over plain http on this machine or in CI
 * (`next start` on 127.0.0.1). Safari/WebKit applies upgrade-insecure-requests to
 * localhost, so every asset would be requested over https and fail; Chromium and
 * Firefox exempt localhost. Deployed builds (Vercel sets VERCEL=1) always upgrade.
 */
export function contentSecurityPolicy({ dev = false, preview = false, local = false } = {}): string {
  const extra = preview ? VERCEL_LIVE : [];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), ...POSTHOG, ...extra],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...POSTHOG, ...extra],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...POSTHOG, ...BETTER_STACK, ...extra],
    "worker-src": ["'self'", "blob:"],
    "frame-src": preview ? VERCEL_LIVE : ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const csp = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!dev && !local) csp.push("upgrade-insecure-requests");
  return csp.join("; ");
}

export function securityHeaders(env: { dev?: boolean; preview?: boolean; local?: boolean } = {}): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(env) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ];
}
