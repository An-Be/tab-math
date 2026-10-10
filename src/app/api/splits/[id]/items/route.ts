import { db } from "@/lib/server/db";
import { json, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { requireSplitOwner } from "@/lib/server/require-split-owner";
import { addItemSchema } from "@/lib/split-schemas";

export async function POST(request: Request, { params }: RouteContext<"/api/splits/[id]/items">) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const body = await parseJsonBody(request, addItemSchema);
  if (!body.ok) return body.response;

  const maxSortOrder = await db.lineItem.aggregate({
    where: { splitId: id },
    _max: { sortOrder: true },
  });

  const item = await db.lineItem.create({
    data: {
      splitId: id,
      ...body.data,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return json({ item }, 201);
}
