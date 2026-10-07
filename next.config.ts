import type { NextConfig } from "next";
import path from "path";

// Baseline security headers, applied to every route. None of these restrict
// which scripts/styles/origins the page can load, so they can't break Clerk,
// Uploadthing, or Google sign-in. A full script-restricting CSP is a
// separate, nonce-based change in proxy.ts; this only sets frame-ancestors.
//
// Permissions-Policy camera=() blocks in-page camera APIs (getUserMedia).
// It does NOT block receipt photos: the uploader uses
// <input type="file" capture="environment">, which hands off to the phone's
// own camera app and returns a file.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  // localhost is already allowed by default. This covers testing from a
  // phone over Wi-Fi, where the request's Origin is your computer's LAN IP
  // (e.g. http://192.168.0.148:3000) — only the hostname matters here, no
  // scheme or port. The wildcard covers the whole /24 in case your IP
  // changes (new network, router reboot, etc).
  allowedDevOrigins: ["192.168.0.148", "192.168.0.*"],
};

export default nextConfig;
