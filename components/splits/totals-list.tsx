"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  async function togglePaid(personId: string, paid: boolean) {
    onPaidChange(personId, paid);
    const res = await fetch(`/api/splits/${splitId}/payments/${personId}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid }),
    });
    if (!res.ok) {
      toast.error("Couldn't update payment status");
      onPaidChange(personId, !paid);
    }
  }

  if (totals.people.length === 0) {
    return (
      <p className="font-mono text-sm text-muted-foreground">
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
                type="button"
                size="sm"
                variant={paid ? "secondary" : "outline"}
                className={cn(
                  "font-mono text-xs tracking-wide uppercase",
                  paid && "text-muted-foreground"
                )}
                onClick={() => togglePaid(pt.personId, !paid)}
              >
                {paid && <Check className="size-3.5" />}
                {paid ? "Paid" : "Mark paid"}
              </Button>
            </div>
          </div>
        );
      })}
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <span className="text-sm">
          Total{" "}
          <span className="font-mono text-xs text-muted-foreground uppercase">
            ({outstanding} outstanding)
          </span>
        </span>
        <span className="font-mono text-sm tabular-nums">{fmt(totals.splitTotalCents)}</span>
      </div>
    </div>
  );
}
