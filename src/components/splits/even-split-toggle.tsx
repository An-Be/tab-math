"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api-client";
import type { SplitMode } from "@/lib/generated/prisma/client";

type Props = {
  splitId: string;
  mode: SplitMode;
  onChange: (mode: SplitMode) => void;
  onSaved: () => void;
};

export function EvenSplitToggle({ splitId, mode, onChange, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  async function patch(newMode: SplitMode) {
    const res = await api(`/api/splits/${splitId}`, { method: "PATCH", body: { mode: newMode } });
    if (!res.ok) {
      toast.error("Couldn't save that change");
      return false;
    }
    return true;
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p id="even-split-label" className="text-sm font-medium">Even split</p>
        <p className="text-xs text-mute">
          Skip assignment — divide everything equally.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {saving && <Loader2 className="size-4 animate-spin text-mute" />}
        <Switch
          aria-labelledby="even-split-label"
          checked={mode === "EVEN"}
          disabled={saving}
          onCheckedChange={async (checked) => {
            const newMode: SplitMode = checked ? "EVEN" : "ITEMIZED";
            // Optimistic: the switch is a controlled component, so it needs
            // this to flip immediately rather than waiting on the network.
            onChange(newMode);
            setSaving(true);
            const ok = await patch(newMode);
            setSaving(false);
            if (ok) {
              // Only now, once the database actually has the new mode, is it
              // safe to refetch totals — doing it alongside the optimistic
              // onChange above would race the save and could read the old mode.
              onSaved();
            } else {
              onChange(mode);
            }
          }}
        />
      </div>
    </div>
  );
}
