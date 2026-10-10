import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const widths = {
  /** One-handed phone column: forms, secret-link views. The default. */
  narrow: "max-w-md",
  /** Organizer screens with more going on, still single column. */
  wide: "max-w-2xl",
} as const;

/** Mobile-first page column. The footer goes inside it; SiteHeader sits above it, full width. */
export function Shell({
  children,
  width = "narrow",
  className,
}: {
  children: ReactNode;
  width?: keyof typeof widths;
  className?: string;
}) {
  return <div className={cn("mx-auto flex w-full flex-1 flex-col px-4", widths[width], className)}>{children}</div>;
}
