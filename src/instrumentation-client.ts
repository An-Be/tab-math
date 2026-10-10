// Runs in the browser before the app is interactive (Next.js instrumentation-client).
// PostHog is optional: without both env vars it stays off and track() is a no-op.
// See docs/modules/analytics-posthog.md.
import posthog from "posthog-js";
import { redactEvent } from "@/lib/analytics";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (token && host) {
  try {
    posthog.init(token, {
      api_host: host,
      defaults: "2026-01-30",
      capture_exceptions: true,
      // Secret links are credentials: strip them from every URL property.
      before_send: redactEvent,
      // Autocapture keeps clicks and pageviews but not element text or attributes,
      // which would carry people's names and secret-link hrefs.
      mask_all_text: true,
      mask_all_element_attributes: true,
      // Replays show names and totals on screen. Turn on per tool, deliberately.
      disable_session_recording: true,
    });
  } catch {
    // Analytics must never break the app.
  }
}
