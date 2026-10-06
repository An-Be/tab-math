"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NewSplitDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [peopleNames, setPeopleNames] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  function updatePersonName(index: number, value: string) {
    setPeopleNames((prev) => prev.map((p, i) => (i === index ? value : p)));
  }

  function addPersonField() {
    setPeopleNames((prev) => [...prev, ""]);
  }

  function removePersonField(index: number) {
    setPeopleNames((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Give the split a name");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          peopleNames: peopleNames.map((p) => p.trim()).filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to create split");
      }
      setOpen(false);
      router.push(`/split/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong creating the split");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="lg" className="font-mono text-xs tracking-wide uppercase" />}
      >
        <Plus className="size-4" />
        New split
      </DialogTrigger>
      <DialogContent className="rounded-none">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading tracking-tight">New split</DialogTitle>
            <DialogDescription>
              Name the split and add the people splitting it. You can add more
              later.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Friday dinner"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>People</Label>
              {peopleNames.map((name, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Person ${i + 1}`}
                    value={name}
                    onChange={(e) => updatePersonName(i, e.target.value)}
                  />
                  {peopleNames.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePersonField(i)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPersonField}
                className="self-start font-mono text-xs tracking-wide uppercase"
              >
                <Plus className="size-4" />
                Add person
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting}
              className="font-mono text-xs tracking-wide uppercase"
            >
              {submitting ? "Creating…" : "Create split"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
