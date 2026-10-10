import type { Ref, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> };

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full border border-ink bg-paper px-3 py-2 font-mono text-base text-ink placeholder:text-faint sm:text-sm",
        "disabled:bg-wash disabled:text-mute aria-invalid:border-2",
        className,
      )}
      {...props}
    />
  );
}
