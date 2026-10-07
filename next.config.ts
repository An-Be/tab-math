import type { NextConfig } from "next";
import path from "path";

// Baseline security headers, applied to every route. None of these restrict
// which scripts/styles/origins the page can load, so they can't break Clerk,
// Uploadthing, or Google sign-in.
//
// No Content-Security-Policy here on purpose: the CSP lives in lib/csp.ts,
// built per request by Clerk with a nonce. A second, nonce-less CSP header
// set here would be picked up by Next ahead of that one and stop Next from
// tagging its own scripts. X-Frame-Options covers clickjacking meanwhile;
// frame-ancestors joins the real CSP once it's enforced.
//
// Permissions-Policy camera=() blocks in-page camera APIs (getUserMedia).
// It does NOT block receipt photos: the uploader uses
// <input type="file" capture="environment">, which hands off to the phone's
// own camera app and returns a file.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
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
