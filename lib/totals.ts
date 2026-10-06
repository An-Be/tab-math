export type TotalsInput = {
  mode: "ITEMIZED" | "EVEN";
  taxCents: number;
  tipCents: number;
  people: { id: string }[];
  items: { id: string; priceCents: number; quantity: number }[];
  assignments: { lineItemId: string; personId: string }[];
};

export type PersonTotal = {
  personId: string;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
};

export type TotalsResult = {
  splitSubtotalCents: number;
  splitTotalCents: number;
  people: PersonTotal[];
};

/** Splits `totalCents` into `n` integer parts that sum back to `totalCents`,
 * handing leftover pennies to the earliest parts first. */
function splitEvenly(totalCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function computeTotals(input: TotalsInput): TotalsResult {
  const { mode, taxCents, tipCents, people, items, assignments } = input;
  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const splitTotalCents = subtotalCents + taxCents + tipCents;

  if (mode === "EVEN") {
    const shares = splitEvenly(splitTotalCents, people.length);
    return {
      splitSubtotalCents: subtotalCents,
      splitTotalCents,
      people: people.map((p, i) => ({
        personId: p.id,
        subtotalCents: 0,
        taxCents: 0,
        tipCents: 0,
        totalCents: shares[i],
      })),
    };
  }

  const personIndex = new Map(people.map((p, i) => [p.id, i]));
  const personSubtotalCents = new Map<string, number>(people.map((p) => [p.id, 0]));

  for (const item of items) {
    const sharerIds = assignments
      .filter((a) => a.lineItemId === item.id)
      .map((a) => a.personId)
      .filter((id) => personIndex.has(id))
      .sort((a, b) => personIndex.get(a)! - personIndex.get(b)!);
    if (sharerIds.length === 0) continue;

    const itemTotalCents = item.priceCents * item.quantity;
    const shares = splitEvenly(itemTotalCents, sharerIds.length);
    sharerIds.forEach((personId, i) => {
      personSubtotalCents.set(personId, personSubtotalCents.get(personId)! + shares[i]);
    });
  }

  const assignedSubtotalCents = people.reduce(
    (sum, p) => sum + personSubtotalCents.get(p.id)!,
    0
  );

  let taxShares: number[];
  let tipShares: number[];
  if (assignedSubtotalCents > 0) {
    // Prorate tax/tip by each person's share of the assigned subtotal, then
    // mop up the rounding remainder so the parts sum exactly to taxCents/tipCents.
    const rawTax = people.map(
      (p) => (taxCents * personSubtotalCents.get(p.id)!) / assignedSubtotalCents
    );
    const rawTip = people.map(
      (p) => (tipCents * personSubtotalCents.get(p.id)!) / assignedSubtotalCents
    );
    taxShares = distributeProrated(rawTax, taxCents);
    tipShares = distributeProrated(rawTip, tipCents);
  } else {
    taxShares = people.map(() => 0);
    tipShares = people.map(() => 0);
  }

  return {
    splitSubtotalCents: subtotalCents,
    splitTotalCents,
    people: people.map((p, i) => {
      const subtotal = personSubtotalCents.get(p.id)!;
      const tax = taxShares[i];
      const tip = tipShares[i];
      return {
        personId: p.id,
        subtotalCents: subtotal,
        taxCents: tax,
        tipCents: tip,
        totalCents: subtotal + tax + tip,
      };
    }),
  };
}

/** Floors each proportional share, then hands the leftover pennies (from
 * flooring) to the people with the largest fractional remainder, so the
 * parts sum exactly to `totalCents`. */
function distributeProrated(rawShares: number[], totalCents: number): number[] {
  const floored = rawShares.map((v) => Math.floor(v));
  let remainder = totalCents - floored.reduce((a, b) => a + b, 0);
  const order = floored
    .map((v, i) => ({ i, frac: rawShares[i] - v }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floored];
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    result[order[k].i] += 1;
  }
  return result;
}
