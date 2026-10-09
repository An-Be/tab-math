"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { toast } from "@/lib/toast";

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Give the split a name");
      return;
    }
    setSubmitting(true);
    const res = await api<{ id: string }>("/api/splits", {
      method: "POST",
      body: { title: title.trim(), peopleNames: peopleNames.map((p) => p.trim()).filter(Boolean) },
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.status === 0 ? "Something went wrong creating the split" : res.error);
      return;
    }
    setOpen(false);
    router.push(`/split/${res.data.id}`);
  }

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        New split
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New split"
        description="Name the split and add the people splitting it. You can add more later."
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field htmlFor="title" label="Title">
            <Input id="title" placeholder="Friday dinner" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="label">People</span>
            {peopleNames.map((name, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={`Person ${i + 1}`}
                  placeholder={`Person ${i + 1}`}
                  value={name}
                  onChange={(e) => updatePersonName(i, e.target.value)}
                />
                {peopleNames.length > 1 && (
                  <Button variant="ghost" size="icon" aria-label={`Remove person ${i + 1}`} onClick={() => removePersonField(i)}>
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addPersonField} className="self-start">
              <Plus className="size-4" aria-hidden="true" />
              Add person
            </Button>
          </div>

          <Button type="submit" block disabled={submitting}>
            {submitting ? "Creating…" : "Create split"}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
