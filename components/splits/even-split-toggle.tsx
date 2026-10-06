"use client";

import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { SplitMode } from "@/lib/generated/prisma/client";

type Props = {
  splitId: string;
  mode: SplitMode;
  onChange: (mode: SplitMode) => void;
};

export function EvenSplitToggle({ splitId, mode, onChange }: Props) {
  async function patch(newMode: SplitMode) {
    const res = await fetch(`/api/splits/${splitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: newMode }),
    });
    if (!res.ok) {
      toast.error("Couldn't save that change");
      return false;
    }
    return true;
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">Even split</p>
        <p className="text-xs text-muted-foreground">
          Skip assignment — divide everything equally.
        </p>
      </div>
      <Switch
        checked={mode === "EVEN"}
        onCheckedChange={async (checked) => {
          const newMode: SplitMode = checked ? "EVEN" : "ITEMIZED";
          onChange(newMode);
          const ok = await patch(newMode);
          if (!ok) onChange(mode);
        }}
      />
    </div>
  );
}
