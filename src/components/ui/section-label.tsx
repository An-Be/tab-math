import type { ReactNode } from "react";

/** The numbered section label: "01 — People", with an optional right-aligned aside. */
export function SectionLabel({ n, children, aside }: { n: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <span className="label">
        {n} — {children}
      </span>
      {aside ? <span className="label text-mute">{aside}</span> : null}
    </div>
  );
}
