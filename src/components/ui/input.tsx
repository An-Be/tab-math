import type { InputHTMLAttributes, Ref } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const inputVariants = cva(
  "w-full border border-ink bg-paper text-ink placeholder:text-faint focus-visible:outline-offset-[-3px] disabled:bg-wash disabled:text-mute aria-invalid:border-2",
  {
    variants: {
      variant: {
        // 16px on mobile so iOS Safari doesn't zoom on focus.
        mono: "h-11 px-3 font-mono text-base sm:text-sm",
        // Big headline input for the one field a screen is about (names, titles).
        display: "h-14 px-4 font-display text-[22px] font-medium tracking-[-0.02em]",
      },
    },
    defaultVariants: { variant: "mono" },
  },
);

export type InputProps = InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof inputVariants> & { ref?: Ref<HTMLInputElement> };

export function Input({ className, variant, ...props }: InputProps) {
  return <input className={cn(inputVariants({ variant }), className)} {...props} />;
}
