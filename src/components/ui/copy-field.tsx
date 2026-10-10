"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import { Button } from "./button";

/** Read-only value with a Copy button, e.g. a share link. */
export function CopyField({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const ok = await copyToClipboard(value);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-stretch">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Link"
        className="h-11 min-w-0 flex-1 border border-r-0 border-ink bg-wash px-3 font-mono text-sm text-ink"
      />
      <Button variant="primary" onClick={onCopy} aria-live="polite">
        {copied ? "Copied" : label}
      </Button>
    </div>
  );
}
