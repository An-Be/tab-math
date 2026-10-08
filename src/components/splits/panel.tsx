import type { ReactNode } from "react";
import { SectionLabel } from "@/components/ui/section-label";

/** One numbered panel of the split workspace. */
export function Panel({ n, title, children }: { n: string; title: ReactNode; children: ReactNode }) {
  return (
    <section>
      <SectionLabel n={n}>{title}</SectionLabel>
      <div className="border border-ink p-5">{children}</div>
    </section>
  );
}
