import { db } from "@/lib/server/db";
import { json, notFound, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { requireSplitOwner } from "@/lib/server/require-split-owner";
import { editItemSchema } from "@/lib/split-schemas";

type Ctx = RouteContext<"/api/splits/[id]/items/[itemId]">;

async function requireItem(splitId: string, itemId: string) {
  const item = await db.lineItem.findUnique({ where: { id: itemId } });
  if (!item || item.splitId !== splitId) return { error: notFound() } as const;
  return { item } as const;
}

export async function PUT(request: Request, { params }: Ctx) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const { id, itemId } = await params;
  const ownerResult = await requireSplitOwner(id);
  if ("error" in ownerResult) return ownerResult.error;

  const itemResult = await requireItem(id, itemId);
  if ("error" in itemResult) return itemResult.error;

  const body = await parseJsonBody(request, editItemSchema);
  if (!body.ok) return body.response;

  const item = await db.lineItem.update({ where: { id: itemId }, data: body.data });
  return json({ item });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const blocked = rejectCrossSite(request, { hasBody: false });
  if (blocked) return blocked;

  const { id, itemId } = await params;
  const ownerResult = await requireSplitOwner(id);
  if ("error" in ownerResult) return ownerResult.error;

  const itemResult = await requireItem(id, itemId);
  if ("error" in itemResult) return itemResult.error;

  await db.lineItem.delete({ where: { id: itemId } });
  return json({ ok: true });
}
