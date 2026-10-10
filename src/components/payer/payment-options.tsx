"use client";

import { Copy } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import type { PaymentOption } from "@/lib/payment-links";
import { track } from "@/lib/track";

export function PaymentOptions({ options }: { options: PaymentOption[] }) {
  if (options.length === 0) {
    return (
      <p className="font-mono text-sm text-mute">
        The organizer hasn&apos;t added a payment method yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) =>
        opt.type === "zelle" ? (
          <Button
            key={opt.type}
            variant="outline"
            size="lg"
            block
            onClick={async () => {
              const ok = await copyToClipboard(opt.value);
              if (ok) {
                track("payment_method_selected", { payment_method: opt.type });
                toast.success("Zelle info copied");
              } else {
                toast.error("Couldn't copy — it's: " + opt.value);
              }
            }}
          >
            <Copy className="size-4" aria-hidden="true" />
            Copy Zelle info ({opt.value})
          </Button>
        ) : (
          // Leaves the app for the payment provider, so a plain <a>, not next/link.
          <a
            key={opt.type}
            href={opt.href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "lg", block: true })}
            onClick={() => track("payment_method_selected", { payment_method: opt.type })}
          >
            Pay with {opt.label}
          </a>
        )
      )}
    </div>
  );
}
