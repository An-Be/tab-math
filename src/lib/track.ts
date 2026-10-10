import posthog from "posthog-js";

// Flat, primitive properties only: counts, modes, outcomes. Never names, notes,
// amounts tied to a person, or anything from a secret link.
export type TrackProps = Record<string, string | number | boolean | null>;

/**
 * Captures a product event. A no-op when PostHog isn't configured (no env vars,
 * local dev), so feature code can call it unconditionally. Client-side only.
 */
export function track(event: string, props?: TrackProps) {
  if (!posthog.__loaded) return;
  posthog.capture(event, props);
}
