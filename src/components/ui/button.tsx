import type { ButtonHTMLAttributes, Ref } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Exported so links can look like buttons without a wrapper:
 * <Link href="/x" className={buttonVariants({ variant: "outline" })}>Go</Link>
 */
export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap border font-mono uppercase tracking-[0.14em] transition-colors disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "border-ink bg-ink text-paper hover:border-mute hover:bg-mute active:bg-ink",
        outline: "border-ink bg-paper text-ink hover:bg-wash active:bg-ink active:text-paper",
        ghost: "border-transparent bg-transparent text-mute underline-offset-4 hover:text-ink hover:underline",
      },
      size: {
        lg: "h-14 px-6 text-[13px]",
        md: "h-11 px-4 text-[12px]",
        sm: "h-8 px-2 text-[11px]",
        icon: "size-11 p-0",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { ref?: Ref<HTMLButtonElement> };

export function Button({ className, variant, size, block, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}
