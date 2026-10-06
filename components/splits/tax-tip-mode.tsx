"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  splitId: string;
  taxCents: number;
  tipCents: number;
  onChange: (patch: { taxCents?: number; tipCents?: number }) => void;
  onSaved: () => void;
};

function centsToDollarsStr(cents: number) {
  return (cents / 100).toFixed(2);
}

function dollarsStrToCents(value: string) {
  const n = Math.round(parseFloat(value || "0") * 100);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function TaxTipMode({ splitId, taxCents, tipCents, onChange, onSaved }: Props) {
  const [savingField, setSavingField] = useState<"tax" | "tip" | null>(null);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/splits/${splitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("Couldn't save that change");
      return false;
    }
    return true;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="tax" className="font-mono text-xs tracking-wide uppercase">
          Tax
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">
            $
          </span>
          <Input
            key={taxCents}
            id="tax"
            type="number"
            step="0.01"
            min={0}
            disabled={savingField === "tax"}
            className="pl-6 font-mono tabular-nums disabled:opacity-60"
            defaultValue={centsToDollarsStr(taxCents)}
            onBlur={async (e) => {
              const cents = dollarsStrToCents(e.target.value);
              if (cents === taxCents) return;
              // Wait for the save to actually land before telling the parent
              // anything changed — otherwise a totals refresh triggered off
              // this could race ahead of the PATCH and read the old value.
              setSavingField("tax");
              const ok = await patch({ taxCents: cents });
              setSavingField(null);
              if (ok) {
                onChange({ taxCents: cents });
                onSaved();
              }
            }}
          />
          {savingField === "tax" && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tip" className="font-mono text-xs tracking-wide uppercase">
          Tip
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">
            $
          </span>
          <Input
            key={tipCents}
            id="tip"
            type="number"
            step="0.01"
            min={0}
            disabled={savingField === "tip"}
            className="pl-6 font-mono tabular-nums disabled:opacity-60"
            defaultValue={centsToDollarsStr(tipCents)}
            onBlur={async (e) => {
              const cents = dollarsStrToCents(e.target.value);
              if (cents === tipCents) return;
              setSavingField("tip");
              const ok = await patch({ tipCents: cents });
              setSavingField(null);
              if (ok) {
                onChange({ tipCents: cents });
                onSaved();
              }
            }}
          />
          {savingField === "tip" && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}
