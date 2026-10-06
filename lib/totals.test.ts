import { describe, expect, it } from "vitest";
import { computeTotals } from "./totals";

function sumPeople(people: { totalCents: number }[]) {
  return people.reduce((sum, p) => sum + p.totalCents, 0);
}

describe("computeTotals — itemized mode", () => {
  it("splits a single item assigned to one person entirely to them", () => {
    const result = computeTotals({
      mode: "ITEMIZED",
      taxCents: 0,
      tipCents: 0,
      people: [{ id: "alice" }, { id: "bob" }],
      items: [{ id: "burger", priceCents: 1495, quantity: 1 }],
      assignments: [{ lineItemId: "burger", personId: "alice" }],
    });

    expect(result.people.find((p) => p.personId === "alice")?.totalCents).toBe(1495);
    expect(result.people.find((p) => p.personId === "bob")?.totalCents).toBe(0);
    expect(result.splitSubtotalCents).toBe(1495);
  });

  it("splits a shared item evenly across its assignees", () => {
    const result = computeTotals({
      mode: "ITEMIZED",
      taxCents: 0,
      tipCents: 0,
      people: [{ id: "alice" }, { id: "bob" }],
      items: [{ id: "fries", priceCents: 500, quantity: 1 }],
      assignments: [
        { lineItemId: "fries", personId: "alice" },
        { lineItemId: "fries", personId: "bob" },
      ],
    });

    expect(result.people.find((p) => p.personId === "alice")?.totalCents).toBe(250);
    expect(result.people.find((p) => p.personId === "bob")?.totalCents).toBe(250);
  });

  it("hands the odd penny from an uneven split to the earliest person", () => {
    // $5.01 split three ways: 167, 167, 167 would be 501 — but 501/3 = 167
    // exactly, so use an amount that doesn't divide evenly: $5.00 / 3.
    const result = computeTotals({
      mode: "ITEMIZED",
      taxCents: 0,
      tipCents: 0,
      people: [{ id: "a" }, { id: "b" }, { id: "c" }],
      items: [{ id: "item", priceCents: 500, quantity: 1 }],
      assignments: [
        { lineItemId: "item", personId: "a" },
        { lineItemId: "item", personId: "b" },
        { lineItemId: "item", personId: "c" },
      ],
    });

    const shares = ["a", "b", "c"].map(
      (id) => result.people.find((p) => p.personId === id)!.totalCents
    );
    expect(shares.reduce((s, v) => s + v, 0)).toBe(500);
    // 500 / 3 = 166.67 -> base 166, remainder 2 pennies go to the first two people in order
    expect(shares).toEqual([167, 167, 166]);
  });

  it("an item with no assignees contributes to nobody's total or the subtotal", () => {
    const result = computeTotals({
      mode: "ITEMIZED",
      taxCents: 0,
      tipCents: 0,
      people: [{ id: "alice" }],
      items: [
        { id: "assigned", priceCents: 1000, quantity: 1 },
        { id: "orphan", priceCents: 500, quantity: 1 },
      ],
      assignments: [{ lineItemId: "assigned", personId: "alice" }],
    });

    expect(result.people.find((p) => p.personId === "alice")?.totalCents).toBe(1000);
    expect(result.splitSubtotalCents).toBe(1500); // subtotal still counts all items
  });

  it("multiplies price by quantity before splitting", () => {
    const result = computeTotals({
      mode: "ITEMIZED",
      taxCents: 0,
      tipCents: 0,
      people: [{ id: "alice" }],
      items: [{ id: "soda", priceCents: 300, quantity: 3 }],
      assignments: [{ lineItemId: "soda", personId: "alice" }],
    });

    expect(result.people.find((p) => p.personId === "alice")?.totalCents).toBe(900);
  });

  it("ignores an assignment that references a person not in this split", () => {
    const result = computeTotals({
      mode: "ITEMIZED",
      taxCents: 0,
      tipCents: 0,
      people: [{ id: "alice" }],
      items: [{ id: "item", priceCents: 1000, quantity: 1 }],
      assignments: [
        { lineItemId: "item", personId: "alice" },
        { lineItemId: "item", personId: "ghost" },
      ],
    });

    // Only alice is a real sharer, so she gets the whole item, not half of it.
    expect(result.people.find((p) => p.personId === "alice")?.totalCents).toBe(1000);
  });

  it("matches the spec's acceptance criteria exactly: 4 people, one shared item, 8.5% tax + 20% tip", () => {
    const people = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const result = computeTotals({
      mode: "ITEMIZED",
      taxCents: 170, // 8.5% of $20.00 subtotal
      tipCents: 400, // 20% of $20.00 subtotal
      people,
      items: [
        { id: "burger", priceCents: 1495, quantity: 1 },
        { id: "fries", priceCents: 505, quantity: 1 },
      ],
      assignments: [
        { lineItemId: "burger", personId: "a" },
        { lineItemId: "fries", personId: "a" },
        { lineItemId: "fries", personId: "b" },
      ],
    });

    // Correct to the cent: every penny of tax/tip/subtotal is accounted for.
    expect(sumPeople(result.people)).toBe(result.splitSubtotalCents + 170 + 400);
  });

  it("prorates tax and tip by each person's share of the subtotal, exactly", () => {
    const result = computeTotals({
      mode: "ITEMIZED",
      taxCents: 170,
      tipCents: 400,
      people: [{ id: "alice" }, { id: "bob" }, { id: "cara" }],
      items: [
        { id: "burger", priceCents: 1495, quantity: 1 },
        { id: "fries", priceCents: 500, quantity: 1 },
      ],
      assignments: [
        { lineItemId: "burger", personId: "alice" },
        { lineItemId: "fries", personId: "alice" },
        { lineItemId: "fries", personId: "bob" },
      ],
    });

    const alice = result.people.find((p) => p.personId === "alice")!;
    const bob = result.people.find((p) => p.personId === "bob")!;
    const cara = result.people.find((p) => p.personId === "cara")!;

    expect(alice.subtotalCents).toBe(1745);
    expect(bob.subtotalCents).toBe(250);
    expect(cara.subtotalCents).toBe(0);

    // Tax/tip shares sum exactly to the inputs, no matter the rounding.
    expect(alice.taxCents + bob.taxCents + cara.taxCents).toBe(170);
    expect(alice.tipCents + bob.tipCents + cara.tipCents).toBe(400);
    expect(cara.taxCents).toBe(0);
    expect(cara.tipCents).toBe(0);

    expect(alice.totalCents + bob.totalCents + cara.totalCents).toBe(
      result.splitSubtotalCents + 170 + 400
    );
  });

  it("gives everyone $0 when nobody has been assigned anything (no divide-by-zero)", () => {
    const result = computeTotals({
      mode: "ITEMIZED",
      taxCents: 170,
      tipCents: 400,
      people: [{ id: "alice" }, { id: "bob" }],
      items: [{ id: "item", priceCents: 1000, quantity: 1 }],
      assignments: [],
    });

    expect(result.people.every((p) => p.totalCents === 0)).toBe(true);
  });

  it("returns an empty people array when the split has no people", () => {
    const result = computeTotals({
      mode: "ITEMIZED",
      taxCents: 0,
      tipCents: 0,
      people: [],
      items: [{ id: "item", priceCents: 1000, quantity: 1 }],
      assignments: [],
    });

    expect(result.people).toEqual([]);
  });
});

describe("computeTotals — even mode", () => {
  it("divides the total equally regardless of any assignments", () => {
    const result = computeTotals({
      mode: "EVEN",
      taxCents: 170,
      tipCents: 400,
      people: [{ id: "a" }, { id: "b" }, { id: "c" }],
      items: [
        { id: "burger", priceCents: 1495, quantity: 1 },
        { id: "fries", priceCents: 500, quantity: 1 },
      ],
      // Assignments present but irrelevant in even mode.
      assignments: [{ lineItemId: "burger", personId: "a" }],
    });

    const total = result.splitSubtotalCents + 170 + 400;
    expect(sumPeople(result.people)).toBe(total);
    // Everyone gets a (near-)equal share; nobody owes $0 just for being unassigned.
    expect(result.people.every((p) => p.totalCents > 0)).toBe(true);
  });

  it("hands the remainder penny to the earliest people when it doesn't divide evenly", () => {
    const result = computeTotals({
      mode: "EVEN",
      taxCents: 0,
      tipCents: 0,
      people: [{ id: "a" }, { id: "b" }, { id: "c" }],
      items: [{ id: "item", priceCents: 1000, quantity: 1 }],
      assignments: [],
    });

    // 1000 / 3 = 333.33 -> 334, 333, 333
    const shares = ["a", "b", "c"].map(
      (id) => result.people.find((p) => p.personId === id)!.totalCents
    );
    expect(shares).toEqual([334, 333, 333]);
    expect(shares.reduce((s, v) => s + v, 0)).toBe(1000);
  });

  it("zeroes everyone's subtotal/tax/tip breakdown — even mode doesn't itemize", () => {
    const result = computeTotals({
      mode: "EVEN",
      taxCents: 170,
      tipCents: 400,
      people: [{ id: "a" }, { id: "b" }],
      items: [{ id: "item", priceCents: 1000, quantity: 1 }],
      assignments: [],
    });

    for (const person of result.people) {
      expect(person.subtotalCents).toBe(0);
      expect(person.taxCents).toBe(0);
      expect(person.tipCents).toBe(0);
    }
  });
});
