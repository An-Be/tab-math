import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSplitOwner } from "@/lib/require-split-owner";
import { computeTotals } from "@/lib/totals";

const markPaidSchema = z.object({
  paid: z.boolean().default(true),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; personId: string }> }
) {
  const { id, personId } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person || person.splitId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = markPaidSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { paid } = parsed.data;

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
  const amountCents = totals.people.find((pt) => pt.personId === personId)?.totalCents ?? 0;

  const payment = await prisma.payment.upsert({
    where: { splitId_personId: { splitId: id, personId } },
    update: { status: paid ? "PAID" : "PENDING", paidAt: paid ? new Date() : null, amountCents },
    create: {
      splitId: id,
      personId,
      amountCents,
      status: paid ? "PAID" : "PENDING",
      paidAt: paid ? new Date() : null,
    },
  });

  return NextResponse.json({ payment });
}
