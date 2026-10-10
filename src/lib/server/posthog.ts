import "server-only";
import { PostHog } from "posthog-node";

// Server-side PostHog (LLM analytics on receipt extraction). Same project and
// env vars as the browser; null when they aren't set, so callers no-op.
const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// Serverless: send each event immediately and flush before the response ends.
// privacyMode: LLM analytics never include prompts or outputs (receipt photos,
// extracted items), only model, latency, tokens, cost and errors.
export const posthogServer =
  token && host ? new PostHog(token, { host, flushAt: 1, flushInterval: 0, privacyMode: true }) : null;
