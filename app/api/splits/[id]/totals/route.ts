import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSplitOwner } from "@/lib/require-split-owner";
import { computeTotals } from "@/lib/totals";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const [people, items, assignments] = await Promise.all([
    prisma.person.findMany({ where: { splitId: id }, orderBy: { createdAt: "asc" } }),
    prisma.lineItem.findMany({ where: { splitId: id }, orderBy: { sortOrder: "asc" } }),
    prisma.assignment.findMany({ where: { lineItem: { splitId: id } } }),
  ]);

  const totals = computeTotals({
    mode: result.split.mode,
    taxCents: result.split.taxCents,
    tipCents: result.split.tipCents,
    people: people.map((p) => ({ id: p.id })),
    items: items.map((i) => ({ id: i.id, priceCents: i.priceCents, quantity: i.quantity })),
    assignments: assignments.map((a) => ({ lineItemId: a.lineItemId, personId: a.personId })),
  });

  return NextResponse.json({
    splitSubtotalCents: totals.splitSubtotalCents,
    splitTotalCents: totals.splitTotalCents,
    people: totals.people.map((pt) => ({
      ...pt,
      name: people.find((p) => p.id === pt.personId)?.name ?? "",
    })),
  });
}
