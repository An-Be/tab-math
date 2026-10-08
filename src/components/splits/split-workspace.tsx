"use client";

import { useState } from "react";
import { EvenSplitToggle } from "@/components/splits/even-split-toggle";
import { ItemsList } from "@/components/splits/items-list";
import { Panel } from "@/components/splits/panel";
import { PaymentHandlesForm } from "@/components/splits/payment-handles";
import { PeopleList } from "@/components/splits/people-list";
import { ReceiptUploader } from "@/components/splits/receipt-uploader";
import { ShareLink } from "@/components/splits/share-link";
import { TaxTipMode } from "@/components/splits/tax-tip-mode";
import { TotalsList, type Totals } from "@/components/splits/totals-list";
import { Divider } from "@/components/ui/divider";
import { api } from "@/lib/api-client";
import type { Assignment, LineItem, Payment, Person, SplitMode } from "@/lib/generated/prisma/client";
import type { PaymentHandles } from "@/lib/payment-links";
import { toast } from "@/lib/toast";

type Props = {
  splitId: string;
  shareToken: string;
  receiptImageUrl: string | null;
  initialItems: LineItem[];
  initialPeople: Person[];
  initialMode: SplitMode;
  initialTaxCents: number;
  initialTipCents: number;
  initialAssignments: Assignment[];
  initialTotals: Totals;
  initialPayments: Payment[];
  paymentHandles: PaymentHandles;
};


function toAssignmentsByItem(assignments: Assignment[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const a of assignments) {
    (map[a.lineItemId] ??= []).push(a.personId);
  }
  return map;
}

export function SplitWorkspace({
  splitId,
  shareToken,
  receiptImageUrl,
  initialItems,
  initialPeople,
  initialMode,
  initialTaxCents,
  initialTipCents,
  initialAssignments,
  initialTotals,
  initialPayments,
  paymentHandles,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [people, setPeople] = useState(initialPeople);
  const [mode, setMode] = useState(initialMode);
  const [taxCents, setTaxCents] = useState(initialTaxCents);
  const [tipCents, setTipCents] = useState(initialTipCents);
  const [assignmentsByItem, setAssignmentsByItem] = useState(
    toAssignmentsByItem(initialAssignments)
  );
  const [totals, setTotals] = useState<Totals>(initialTotals);
  const [paidPersonIds, setPaidPersonIds] = useState(
    new Set(initialPayments.filter((p) => p.status === "PAID").map((p) => p.personId))
  );
  const [extractFailed, setExtractFailed] = useState<string | null>(null);

  function handlePaidChange(personId: string, paid: boolean) {
    setPaidPersonIds((prev) => {
      const next = new Set(prev);
      if (paid) next.add(personId);
      else next.delete(personId);
      return next;
    });
  }

  async function refreshTotals() {
    const res = await api<Totals>(`/api/splits/${splitId}/totals`, { method: "GET" });
    if (!res.ok) return;
    setTotals(res.data);
  }

  // Each of these wraps a state setter so every mutation that feeds totals
  // (items, people, mode, tax/tip, assignments) refetches the server-computed
  // result right after — rather than inferring "something changed" from an
  // effect watching all of them.
  function handleItemsChange(newItems: LineItem[]) {
    setItems(newItems);
    refreshTotals();
  }

  function handlePeopleChange(newPeople: Person[]) {
    setPeople(newPeople);
    refreshTotals();
  }

  // These two don't refreshTotals() themselves — TaxTipMode and
  // EvenSplitToggle each call onSaved (= refreshTotals) only once their own
  // PATCH has actually resolved. Doing it here instead, synchronously with
  // the optimistic state update, would race the GET /totals against the
  // PATCH that's still in flight — the totals could get computed from the
  // not-yet-updated database row and nothing would re-fetch afterward.
  function handleTaxTipChange(patch: { taxCents?: number; tipCents?: number }) {
    if (patch.taxCents !== undefined) setTaxCents(patch.taxCents);
    if (patch.tipCents !== undefined) setTipCents(patch.tipCents);
  }

  function handleModeChange(newMode: SplitMode) {
    setMode(newMode);
  }

  async function toggleAssignment(lineItemId: string, personId: string) {
    const current = assignmentsByItem[lineItemId] ?? [];
    const next = current.includes(personId)
      ? current.filter((id) => id !== personId)
      : [...current, personId];

    setAssignmentsByItem((prev) => ({ ...prev, [lineItemId]: next }));

    const res = await api(`/api/splits/${splitId}/assignments`, { method: "POST", body: { lineItemId, personIds: next } });
    if (!res.ok) {
      toast.error("Couldn't save that assignment");
      setAssignmentsByItem((prev) => ({ ...prev, [lineItemId]: current }));
      return;
    }
    refreshTotals();
  }

  return (
    <div className="flex flex-col gap-8">
      <Panel n="01" title="Receipt">
          <ReceiptUploader
            splitId={splitId}
            receiptImageUrl={receiptImageUrl}
            onExtracted={(newItems, newTaxCents, newTipCents) => {
              setItems(newItems);
              setTaxCents(newTaxCents);
              setTipCents(newTipCents);
              setExtractFailed(null);
              refreshTotals();
            }}
            onExtractFailed={(rawText) => setExtractFailed(rawText)}
          />
          {extractFailed !== null && (
            <p className="mt-3 text-center text-sm text-mute">
              Couldn&apos;t read that automatically — add the items below by
              hand.
            </p>
          )}
      </Panel>

      <Panel n="02" title="People">
          <PeopleList splitId={splitId} people={people} onPeopleChange={handlePeopleChange} />
      </Panel>

      <Panel n="03" title="Even split">
          <EvenSplitToggle
            splitId={splitId}
            mode={mode}
            onChange={handleModeChange}
            onSaved={refreshTotals}
          />
      </Panel>

      <Panel n="04" title="Items">
          {mode === "EVEN" && (
            <p className="label mb-3 text-mute">
              Even split — no assignment needed.
            </p>
          )}
          <ItemsList
            splitId={splitId}
            items={items}
            people={people}
            mode={mode}
            assignmentsByItem={assignmentsByItem}
            onItemsChange={handleItemsChange}
            onToggleAssignment={toggleAssignment}
          />
          {items.length > 0 && (
            <>
              <Divider className="my-4" />
              <p className="text-right font-mono text-sm tabular-nums">
                Subtotal: $
                {(
                  items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0) / 100
                ).toFixed(2)}
              </p>
            </>
          )}
      </Panel>

      <Panel n="05" title="Tax & tip">
          <TaxTipMode
            splitId={splitId}
            taxCents={taxCents}
            tipCents={tipCents}
            onChange={handleTaxTipChange}
            onSaved={refreshTotals}
          />
      </Panel>

      <Panel n="06" title="Totals & payments">
          <TotalsList
            splitId={splitId}
            totals={totals}
            paidPersonIds={paidPersonIds}
            onPaidChange={handlePaidChange}
          />
      </Panel>

      <Panel n="07" title="Payment methods">
          <PaymentHandlesForm splitId={splitId} handles={paymentHandles} />
      </Panel>

      <Panel n="08" title="Share">
          <ShareLink shareToken={shareToken} people={people} />
      </Panel>
    </div>
  );
}
