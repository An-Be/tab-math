import { db } from "@/lib/server/db";
import { json, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { requireSplitOwner } from "@/lib/server/require-split-owner";
import { setAssignmentsSchema } from "@/lib/split-schemas";

export async function POST(request: Request, { params }: RouteContext<"/api/splits/[id]/assignments">) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const body = await parseJsonBody(request, setAssignmentsSchema);
  if (!body.ok) return body.response;
  // Dedupe so the count check below can't be fooled by repeats.
  const lineItemId = body.data.lineItemId;
  const personIds = [...new Set(body.data.personIds)];

  const item = await db.lineItem.findUnique({ where: { id: lineItemId } });
  if (!item || item.splitId !== id) {
    return json({ error: "Item not found" }, 404);
  }

  const validPeople = await db.person.count({
    where: { id: { in: personIds }, splitId: id },
  });
  if (validPeople !== personIds.length) {
    return json({ error: "Invalid person id" }, 400);
  }

  const assignments = await db.$transaction(async (tx) => {
    await tx.assignment.deleteMany({ where: { lineItemId } });
    if (personIds.length > 0) {
      await tx.assignment.createMany({
        data: personIds.map((personId) => ({ lineItemId, personId })),
      });
    }
    return tx.assignment.findMany({ where: { lineItemId } });
  });

  return json({ assignments });
}
