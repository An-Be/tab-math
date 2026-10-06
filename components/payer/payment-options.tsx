"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import type { PaymentOption } from "@/lib/payment-links";

export function PaymentOptions({ options }: { options: PaymentOption[] }) {
  if (options.length === 0) {
    return (
      <p className="font-mono text-sm text-muted-foreground">
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
            type="button"
            variant="outline"
            size="lg"
            className="font-mono text-xs tracking-wide uppercase"
            onClick={async () => {
              const ok = await copyToClipboard(opt.value);
              if (ok) {
                toast.success("Zelle info copied");
              } else {
                toast.error("Couldn't copy — it's: " + opt.value);
              }
            }}
          >
            <Copy className="size-4" />
            Copy Zelle info ({opt.value})
          </Button>
        ) : (
          <Button
            key={opt.type}
            render={<a href={opt.href} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
            size="lg"
            className="font-mono text-xs tracking-wide uppercase"
          >
            Pay with {opt.label}
          </Button>
        )
      )}
    </div>
  );
}
