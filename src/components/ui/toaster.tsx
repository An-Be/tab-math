"use client";

import { useSyncExternalStore } from "react";
import { dismiss, getToasts, subscribe, type ToastItem } from "@/lib/toast";
import { cn } from "@/lib/utils";

const empty: ToastItem[] = [];

/** Renders toasts queued with toast() from src/lib/toast.ts. Mount once in the root layout. */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getToasts, () => empty);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {/* Two live regions: errors interrupt, everything else waits its turn. */}
      <div role="status" aria-live="polite" className="contents">
        {toasts.filter((t) => t.tone !== "error").map((t) => (
          <ToastRow key={t.id} toast={t} />
        ))}
      </div>
      <div role="alert" aria-live="assertive" className="contents">
        {toasts.filter((t) => t.tone === "error").map((t) => (
          <ToastRow key={t.id} toast={t} />
        ))}
      </div>
    </div>
  );
}

function ToastRow({ toast }: { toast: ToastItem }) {
  return (
    <button
      type="button"
      onClick={() => dismiss(toast.id)}
      className={cn(
        "label pointer-events-auto max-w-md border border-ink px-4 py-3 text-left",
        toast.tone === "error" ? "bg-paper text-ink border-2" : "bg-ink text-paper",
      )}
    >
      {toast.message}
    </button>
  );
}
