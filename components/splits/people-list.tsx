"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Person } from "@/lib/generated/prisma/client";

type Props = {
  splitId: string;
  people: Person[];
  onPeopleChange: (people: Person[]) => void;
};

export function PeopleList({ splitId, people, onPeopleChange }: Props) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/splits/${splitId}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
      const { person } = await res.json();
      onPeopleChange([...people, person]);
      setName("");
    } catch {
      toast.error("Couldn't add person");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {people.map((person) => (
          <div
            key={person.id}
            className="flex items-center gap-2 rounded-none border border-foreground/15 px-3 py-1"
          >
            <Avatar className="size-5 rounded-none after:rounded-none">
              <AvatarFallback className="rounded-none font-mono text-xs">
                {person.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{person.name}</span>
          </div>
        ))}
        {people.length === 0 && (
          <p className="font-mono text-sm text-muted-foreground">No one added yet.</p>
        )}
      </div>

      <form onSubmit={addPerson} className="flex gap-2">
        <Input
          placeholder="Add a person"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={adding}
          className="font-mono text-xs tracking-wide uppercase"
        >
          <Plus className="size-4" />
          Add
        </Button>
      </form>
    </div>
  );
}
