import type { NextConfig } from "next";
import path from "node:path";

// Baseline security headers on every route. The Content-Security-Policy is NOT
// here on purpose: clerkMiddleware builds it per request with a nonce
// (src/lib/clerk-csp.ts), and a second CSP header would break Next's script tagging.
//
// Two documented exceptions to the template defaults, both for Clerk sign-in:
// - Referrer-Policy is strict-origin-when-cross-origin (proven with Clerk and
//   Google OAuth in production). It still never sends a path, so /p/<token>
//   doesn't leak to other sites.
// - COOP is same-origin-allow-popups so an OAuth popup can talk back to the page.
const securityHeaders = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // camera=() blocks in-page camera APIs only. <input type="file" capture> still
  // opens the phone's own camera app, so photo uploads keep working.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

// Secret-link pages and API responses: never cached by shared caches, never indexed.
const privateHeaders = [
  { key: "Cache-Control", value: "private, no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Payer links, organizer pages and the dashboard.
      { source: "/p/:path*", headers: privateHeaders },
      { source: "/split/:path*", headers: privateHeaders },
      { source: "/splits", headers: privateHeaders },
      { source: "/api/:path*", headers: privateHeaders },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Lets you open the dev server from your phone over Wi-Fi (hostname only).
  allowedDevOrigins: ["192.168.0.*", "192.168.1.*", "10.0.0.*"],
};

export default nextConfig;
