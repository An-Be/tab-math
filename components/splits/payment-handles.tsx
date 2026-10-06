"use client";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentHandles } from "@/lib/payment-links";

type Props = {
  splitId: string;
  handles: PaymentHandles;
};

const FIELDS: { key: keyof PaymentHandles; label: string; placeholder: string }[] = [
  { key: "venmo", label: "Venmo", placeholder: "@your-handle" },
  { key: "cashapp", label: "Cash App", placeholder: "$your-cashtag" },
  { key: "zelle", label: "Zelle", placeholder: "email or phone" },
  { key: "stripeLink", label: "Stripe link", placeholder: "https://buy.stripe.com/..." },
];

export function PaymentHandlesForm({ splitId, handles }: Props) {
  async function save(key: keyof PaymentHandles, value: string) {
    const res = await fetch(`/api/splits/${splitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentHandles: { [key]: value } }),
    });
    if (!res.ok) toast.error("Couldn't save that");
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-2">
          <Label htmlFor={field.key} className="font-mono text-xs tracking-wide uppercase">
            {field.label}
          </Label>
          <Input
            id={field.key}
            placeholder={field.placeholder}
            defaultValue={handles[field.key] ?? ""}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value !== (handles[field.key] ?? "")) save(field.key, value);
            }}
          />
        </div>
      ))}
    </div>
  );
}
