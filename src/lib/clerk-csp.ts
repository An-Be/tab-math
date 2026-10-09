import type { ClerkMiddlewareOptions } from "@clerk/nextjs/server";
import { cspAllowlist } from "@/config/csp";
import { baseDirectives, CSP_REPORT_PATH, mergeDirectives } from "@/lib/csp";

/**
 * Content-Security-Policy for TabMath, built and applied by clerkMiddleware in
 * src/proxy.ts (the auth module variant of the template's proxy).
 *
 * Clerk generates the per-request nonce, merges these directives into its own
 * defaults (which allow its Frontend API, img.clerk.com and Cloudflare's bot
 * check), and passes the nonce to Next so its scripts get tagged. `strict`
 * swaps the host allowlist in script-src for 'strict-dynamic' + the nonce.
 *
 * script-src and style-src are left to Clerk: it needs inline styles for its
 * components, and it owns the nonce. Everything else comes from the shared
 * template defaults (src/lib/csp.ts) plus this tool's allowlist
 * (src/config/csp.ts).
 *
 * REPORT-ONLY for now: browsers report what this would block to
 * /api/csp-report but block nothing. Flip `reportOnly` to false only after
 * the reports have gone quiet across sign-in, receipt upload and the payer
 * view. frame-ancestors is ignored in a report-only policy; X-Frame-Options
 * (next.config.ts) covers clickjacking until this is enforced.
 *
 * This must stay the ONLY Content-Security-Policy header on the response.
 */
function sharedDirectives(): Record<string, string[]> {
  const {
    "script-src": _script,
    "style-src": _style,
    // Ignored (and warned about) in a report-only policy; restore when enforcing.
    "upgrade-insecure-requests": _upgrade,
    ...rest
  } = baseDirectives("clerk-sets-the-nonce", process.env.NODE_ENV === "development");
  return mergeDirectives(rest, cspAllowlist);
}

export const contentSecurityPolicy: NonNullable<ClerkMiddlewareOptions["contentSecurityPolicy"]> = {
  strict: true,
  reportOnly: true,
  reportTo: CSP_REPORT_PATH,
  directives: sharedDirectives(),
};
