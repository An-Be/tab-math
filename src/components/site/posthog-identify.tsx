"use client";

import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

/**
 * Ties PostHog events to the signed-in organizer's Clerk id, and resets on
 * sign-out so the next person on the device starts anonymous. Guests and payers
 * stay anonymous. Only the id is sent, never the email or name.
 */
export function PostHogIdentify() {
  const { isLoaded, user } = useUser();
  const identified = useRef<string | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!isLoaded || !posthog.__loaded) return;
    if (!userId) {
      if (identified.current) {
        posthog.reset();
        identified.current = null;
      }
      return;
    }
    if (identified.current === userId) return;
    if (identified.current) posthog.reset();
    posthog.identify(userId);
    identified.current = userId;
  }, [isLoaded, userId]);

  return null;
}
