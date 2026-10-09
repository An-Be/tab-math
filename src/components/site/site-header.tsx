import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/config/site";
import { Mark } from "./mark";

export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 border-b border-ink py-4">
      <Link href="/" className="flex items-center gap-3">
        <Mark size={28} />
        <span className="display text-[22px] leading-none">{site.name}</span>
      </Link>
      {right ? <div className="label ml-auto flex items-center gap-4 text-mute">{right}</div> : null}
    </header>
  );
}
