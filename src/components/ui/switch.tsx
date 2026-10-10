"use client";

import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center border border-ink transition-colors disabled:opacity-40",
        checked ? "bg-ink" : "bg-paper",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block size-4 transition-transform",
          checked ? "translate-x-[22px] bg-paper" : "translate-x-[3px] bg-ink",
        )}
      />
    </button>
  );
}
