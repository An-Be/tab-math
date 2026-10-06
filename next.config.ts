import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
