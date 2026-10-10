"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Modal built on the native <dialog> element: focus trapping, Escape to close,
 * inert background and top-layer stacking come from the browser.
 * Controlled: the parent owns `open`.
 */
export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={(e) => {
        // Backdrop click: the event target is the <dialog> itself, not its content.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-md border border-ink bg-paper p-0 text-ink",
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="display text-2xl">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="label text-mute hover:text-ink" aria-label="Close">
            Close
          </button>
        </div>
        {description ? (
          <p id={descId} className="text-sm text-mute">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </dialog>
  );
}
