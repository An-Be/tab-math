"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import type { Person } from "@/lib/generated/prisma/client";

type Props = {
  shareToken: string;
  people: Person[];
};

async function copy(url: string, label: string) {
  const ok = await copyToClipboard(url);
  if (ok) {
    toast.success(`${label} link copied`);
  } else {
    toast.error("Couldn't copy — long-press the link above to copy it manually");
  }
}

export function ShareLink({ shareToken, people }: Props) {
  // Keep the rendered text identical on server and client (just the path) —
  // window.location.origin only exists client-side, so it's read lazily
  // inside the click handlers instead of during render.
  const path = `/p/${shareToken}`;
  const fullUrl = (suffix = "") => `${window.location.origin}${path}${suffix}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Share this link anywhere — everyone taps their own name.
        </p>
        <Button
          type="button"
          variant="outline"
          className="justify-between font-mono text-xs"
          onClick={() => copy(fullUrl(), "Share")}
        >
          <span className="truncate">{path}</span>
          <Copy className="size-4" />
        </Button>
      </div>

      {people.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
            Or copy a direct link for one person
          </p>
          {people.map((person) => (
            <Button
              key={person.id}
              type="button"
              variant="ghost"
              size="sm"
              className="justify-between font-mono text-xs"
              onClick={() => copy(fullUrl(`?as=${person.id}`), person.name)}
            >
              <span>{person.name}</span>
              <Copy className="size-3.5" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
