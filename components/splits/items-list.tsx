"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LineItem, Person, SplitMode } from "@/lib/generated/prisma/client";

type Props = {
  splitId: string;
  items: LineItem[];
  people: Person[];
  mode: SplitMode;
  assignmentsByItem: Record<string, string[]>;
  onItemsChange: (items: LineItem[]) => void;
  onToggleAssignment: (lineItemId: string, personId: string) => void;
};

function centsToDollarsStr(cents: number) {
  return (cents / 100).toFixed(2);
}

function dollarsStrToCents(value: string) {
  const n = Math.round(parseFloat(value || "0") * 100);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function ItemsList({
  splitId,
  items,
  people,
  mode,
  assignmentsByItem,
  onItemsChange,
  onToggleAssignment,
}: Props) {
  const [adding, setAdding] = useState(false);

  async function updateItem(itemId: string, patch: Partial<Pick<LineItem, "label" | "priceCents" | "quantity">>) {
    const res = await fetch(`/api/splits/${splitId}/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Couldn't save that change");
      return;
    }
    const { item } = await res.json();
    onItemsChange(items.map((i) => (i.id === itemId ? item : i)));
  }

  async function deleteItem(itemId: string) {
    const res = await fetch(`/api/splits/${splitId}/items/${itemId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Couldn't remove that item");
      return;
    }
    onItemsChange(items.filter((i) => i.id !== itemId));
  }

  async function addItem() {
    setAdding(true);
    try {
      const res = await fetch(`/api/splits/${splitId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "New item", priceCents: 0, quantity: 1 }),
      });
      if (!res.ok) throw new Error();
      const { item } = await res.json();
      onItemsChange([...items, item]);
    } catch {
      toast.error("Couldn't add item");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const assignedIds = assignmentsByItem[item.id] ?? [];
        return (
          <div key={item.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                defaultValue={item.label}
                className="flex-1"
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && value !== item.label) updateItem(item.id, { label: value });
                }}
              />
              <Input
                defaultValue={item.quantity}
                type="number"
                min={1}
                className="w-16 font-mono tabular-nums"
                onBlur={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (value > 0 && value !== item.quantity) updateItem(item.id, { quantity: value });
                }}
              />
              <span className="font-mono text-muted-foreground">×</span>
              <div className="relative w-24">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">
                  $
                </span>
                <Input
                  defaultValue={centsToDollarsStr(item.priceCents)}
                  type="number"
                  step="0.01"
                  min={0}
                  className="pl-6 font-mono tabular-nums"
                  onBlur={(e) => {
                    const cents = dollarsStrToCents(e.target.value);
                    if (cents !== item.priceCents) updateItem(item.id, { priceCents: cents });
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {mode === "ITEMIZED" && people.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-1">
                {people.map((person) => {
                  const assigned = assignedIds.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => onToggleAssignment(item.id, person.id)}
                      className={cn(
                        "rounded-none border px-2 py-0.5 font-mono text-xs uppercase transition-colors",
                        assigned
                          ? "border-foreground bg-foreground text-background"
                          : "border-foreground/15 text-muted-foreground hover:border-foreground/40"
                      )}
                    >
                      {person.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {items.length === 0 && (
        <p className="font-mono text-sm text-muted-foreground">No items yet.</p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 self-start font-mono text-xs tracking-wide uppercase"
        disabled={adding}
        onClick={addItem}
      >
        <Plus className="size-4" />
        Add item
      </Button>
    </div>
  );
}
