import type { CspDirectives } from "@/lib/csp";

// TabMath's additions to the shared CSP (src/lib/csp.ts). Clerk's own origins
// are added by clerkMiddleware (src/lib/clerk-csp.ts), so they aren't listed.
export const cspAllowlist: CspDirectives = {
  // Uploadthing: the browser PUTs the photo straight to an ingest host, then
  // the stored file is served from ufs.sh (utfs.io is the legacy host).
  "connect-src": ["https://*.ingest.uploadthing.com", "https://api.uploadthing.com", "https://*.ufs.sh", "https://utfs.io"],
  // Stored receipt photos (blob: and data: for the local preview are in the defaults).
  "img-src": ["https://*.ufs.sh", "https://utfs.io"],
};
