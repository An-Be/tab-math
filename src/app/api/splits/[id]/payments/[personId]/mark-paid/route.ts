import { db } from "@/lib/server/db";
import { json, notFound, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { requireSplitOwner } from "@/lib/server/require-split-owner";
import { markPaidSchema } from "@/lib/split-schemas";
import { computeTotals } from "@/lib/totals";

export async function POST(request: Request, { params }: RouteContext<"/api/splits/[id]/payments/[personId]/mark-paid">) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const { id, personId } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const person = await db.person.findUnique({ where: { id: personId } });
  if (!person || person.splitId !== id) {
    return notFound();
  }

  const body = await parseJsonBody(request, markPaidSchema);
  if (!body.ok) return body.response;
  const { paid } = body.data;

  const [people, items, assignments] = await Promise.all([
    db.person.findMany({ where: { splitId: id }, orderBy: { createdAt: "asc" } }),
    db.lineItem.findMany({ where: { splitId: id }, orderBy: { sortOrder: "asc" } }),
    db.assignment.findMany({ where: { lineItem: { splitId: id } } }),
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

  const payment = await db.payment.upsert({
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

  return json({ payment });
}
