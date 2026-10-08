"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { Person } from "@/lib/generated/prisma/client";

type Props = {
  splitId: string;
  people: Person[];
  onPeopleChange: (people: Person[]) => void;
};

export function PeopleList({ splitId, people, onPeopleChange }: Props) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function addPerson(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    const res = await api<{ person: Person }>(`/api/splits/${splitId}/people`, { method: "POST", body: { name: trimmed } });
    setAdding(false);
    if (!res.ok) {
      toast.error("Couldn't add person");
      return;
    }
    onPeopleChange([...people, res.data.person]);
    setName("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {people.map((person) => (
          <div
            key={person.id}
            className="flex items-center gap-2 border border-ink px-3 py-1"
          >
            <span aria-hidden="true" className="flex size-5 items-center justify-center bg-ink font-mono text-[11px] text-paper">
              {person.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-sm">{person.name}</span>
          </div>
        ))}
        {people.length === 0 && (
          <p className="font-mono text-sm text-mute">No one added yet.</p>
        )}
      </div>

      <form onSubmit={addPerson} className="flex gap-2">
        <Input
          aria-label="Add a person"
          placeholder="Add a person"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="outline" disabled={adding}>
          <Plus className="size-4" aria-hidden="true" />
          Add
        </Button>
      </form>
    </div>
  );
}
