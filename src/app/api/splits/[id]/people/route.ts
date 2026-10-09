import { db } from "@/lib/server/db";
import { json, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { requireSplitOwner } from "@/lib/server/require-split-owner";
import { addPersonSchema } from "@/lib/split-schemas";

export async function POST(request: Request, { params }: RouteContext<"/api/splits/[id]/people">) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const body = await parseJsonBody(request, addPersonSchema);
  if (!body.ok) return body.response;

  const person = await db.person.create({ data: { splitId: id, name: body.data.name } });

  return json({ person }, 201);
}
