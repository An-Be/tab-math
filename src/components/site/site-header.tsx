import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/config/site";
import { Mark } from "./mark";

/**
 * Full-width top bar shared by every tiny tool (TabMath's header): small mark +
 * uppercase wordmark on the left, mono nav or status on the right, hairline below.
 * Render it above the page's Shell, not inside it.
 */
export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3">
      <Link href="/" className="flex items-center gap-2 font-display text-sm font-medium uppercase tracking-tight">
        <Mark size={22} />
        {site.name}
      </Link>
      {right ? (
        <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-wide text-mute">{right}</div>
      ) : null}
    </header>
  );
}
