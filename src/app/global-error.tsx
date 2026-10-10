"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import "./globals.css";

// Replaces the root layout when it crashes, so it brings its own <html>/<body>.
// Reports the error to PostHog when analytics is on (src/instrumentation-client.ts).
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    if (posthog.__loaded) posthog.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-start justify-center gap-6 px-4">
        <p className="label text-mute">Error</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Something went wrong.</h1>
        <button type="button" onClick={() => retry()} className="label border border-ink px-4 py-3 hover:bg-wash">
          Try again
        </button>
      </body>
    </html>
  );
}
