import type { ClerkMiddlewareOptions } from "@clerk/nextjs/server";

/**
 * Content-Security-Policy, built and applied by clerkMiddleware in proxy.ts.
 *
 * Clerk generates a fresh nonce per request, merges these directives into
 * its own defaults (which already allow clerk.tabmath.com, img.clerk.com and
 * Cloudflare's bot-check frame), and passes the nonce to Next so its own
 * scripts get tagged automatically. `strict` swaps the host allowlist in
 * script-src for 'strict-dynamic' + the nonce: only scripts we rendered, and
 * scripts those scripts load, can run.
 *
 * REPORT-ONLY for now: browsers report what this would block to
 * /api/csp-report but block nothing. Flip `reportOnly` to false only after
 * the reports have gone quiet across sign-in, receipt upload and the payer
 * view. frame-ancestors is enforced separately in next.config.ts, since
 * browsers ignore it in a report-only policy.
 */
export const CSP_REPORT_PATH = "/api/csp-report";

export const contentSecurityPolicy: NonNullable<ClerkMiddlewareOptions["contentSecurityPolicy"]> = {
  strict: true,
  reportOnly: true,
  reportTo: CSP_REPORT_PATH,
  directives: {
    // Uploadthing: the browser PUTs the photo straight to an ingest host,
    // then the stored file is served from ufs.sh (utfs.io is the legacy host).
    "connect-src": [
      "https://*.ingest.uploadthing.com",
      "https://api.uploadthing.com",
      "https://*.ufs.sh",
      "https://utfs.io",
    ],
    // blob: is the local receipt preview (URL.createObjectURL) before upload.
    "img-src": ["blob:", "data:", "https://*.ufs.sh", "https://utfs.io"],
    "font-src": ["self"],
    "object-src": ["none"],
    "base-uri": ["self"],
    // report-to (above) covers Chromium; Safari and Firefox still only
    // understand the older report-uri.
    "report-uri": [CSP_REPORT_PATH],
  },
};
