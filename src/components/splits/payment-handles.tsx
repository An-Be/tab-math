"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { PaymentHandles } from "@/lib/payment-links";
import { toast } from "@/lib/toast";

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
    const res = await api(`/api/splits/${splitId}`, { method: "PATCH", body: { paymentHandles: { [key]: value } } });
    if (!res.ok) toast.error("Couldn't save that");
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {FIELDS.map((field) => (
        <Field key={field.key} htmlFor={field.key} label={field.label}>
          <Input
            id={field.key}
            placeholder={field.placeholder}
            defaultValue={handles[field.key] ?? ""}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value !== (handles[field.key] ?? "")) save(field.key, value);
            }}
          />
        </Field>
      ))}
    </div>
  );
}
