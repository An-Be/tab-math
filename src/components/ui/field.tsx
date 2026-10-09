import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  /** id of the control inside; wires the label and the hint/error. */
  htmlFor: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * Label + control + hint/error. Give the control `aria-describedby={`${id}-desc`}`
 * and `aria-invalid` when there's an error.
 */
export function Field({ htmlFor, label, hint, error, className, children }: FieldProps) {
  const desc = error ?? hint;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {desc ? (
        <p id={`${htmlFor}-desc`} className={cn("text-xs", error ? "text-ink" : "text-mute")} role={error ? "alert" : undefined}>
          {desc}
        </p>
      ) : null}
    </div>
  );
}
