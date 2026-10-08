"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export type PersonTotal = {
  personId: string;
  name: string;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
};

export type Totals = {
  splitSubtotalCents: number;
  splitTotalCents: number;
  people: PersonTotal[];
};

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

type Props = {
  splitId: string;
  totals: Totals;
  paidPersonIds: Set<string>;
  onPaidChange: (personId: string, paid: boolean) => void;
};

export function TotalsList({ splitId, totals, paidPersonIds, onPaidChange }: Props) {
  const [savingPersonId, setSavingPersonId] = useState<string | null>(null);

  async function togglePaid(personId: string, paid: boolean) {
    onPaidChange(personId, paid);
    setSavingPersonId(personId);
    const res = await api(`/api/splits/${splitId}/payments/${personId}/mark-paid`, { method: "POST", body: { paid } });
    setSavingPersonId(null);
    if (!res.ok) {
      toast.error("Couldn't update payment status");
      onPaidChange(personId, !paid);
    }
  }

  if (totals.people.length === 0) {
    return (
      <p className="font-mono text-sm text-mute">
        Add people to see what everyone owes.
      </p>
    );
  }

  const outstanding = totals.people.filter((pt) => !paidPersonIds.has(pt.personId)).length;

  return (
    <div className="flex flex-col gap-3">
      {totals.people.map((pt) => {
        const paid = paidPersonIds.has(pt.personId);
        return (
          <div key={pt.personId} className="flex items-center justify-between gap-3">
            <span className="text-sm">{pt.name}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm tabular-nums">{fmt(pt.totalCents)}</span>
              <Button
                size="sm"
                variant="outline"
                aria-pressed={paid}
                disabled={savingPersonId === pt.personId}
                className={cn(paid && "border-wash bg-wash text-mute")}
                onClick={() => togglePaid(pt.personId, !paid)}
              >
                {savingPersonId === pt.personId ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  paid && <Check className="size-3.5" aria-hidden="true" />
                )}
                {paid ? "Paid" : "Mark paid"}
              </Button>
            </div>
          </div>
        );
      })}
      <Divider />
      <div className="flex items-center justify-between font-medium">
        <span className="text-sm">
          Total{" "}
          <span className="font-mono text-xs text-mute uppercase">
            ({outstanding} outstanding)
          </span>
        </span>
        <span className="font-mono text-sm tabular-nums">{fmt(totals.splitTotalCents)}</span>
      </div>
    </div>
  );
}
