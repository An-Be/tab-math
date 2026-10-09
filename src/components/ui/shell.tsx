import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const widths = {
  /** One-handed phone column: forms, secret-link views. The default. */
  narrow: "max-w-md",
  /** Organizer screens with more going on, still single column. */
  wide: "max-w-2xl",
} as const;

/** Mobile-first page column. Header and footer go inside it. */
export function Shell({
  children,
  width = "narrow",
  className,
}: {
  children: ReactNode;
  width?: keyof typeof widths;
  className?: string;
}) {
  return <div className={cn("mx-auto flex min-h-dvh w-full flex-col px-4", widths[width], className)}>{children}</div>;
}
