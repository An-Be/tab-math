import { db } from "@/lib/server/db";
import { json, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { requireSplitOwner } from "@/lib/server/require-split-owner";
import { patchSplitSchema } from "@/lib/split-schemas";

type Ctx = RouteContext<"/api/splits/[id]">;

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const split = await db.split.findUnique({
    where: { id },
    include: {
      people: { orderBy: { createdAt: "asc" } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  return json({ split });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) return result.error;

  const body = await parseJsonBody(request, patchSplitSchema);
  if (!body.ok) return body.response;

  const { paymentHandles, ...splitFields } = body.data;

  if (paymentHandles) {
    const user = await db.user.findUnique({ where: { id: result.userId }, select: { paymentHandles: true } });
    const existing =
      user?.paymentHandles && typeof user.paymentHandles === "object"
        ? (user.paymentHandles as Record<string, string>)
        : {};
    await db.user.update({
      where: { id: result.userId },
      data: { paymentHandles: { ...existing, ...paymentHandles } },
    });
  }

  const split = await db.split.update({ where: { id }, data: splitFields });

  return json({ split });
}
