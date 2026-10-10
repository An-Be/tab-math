import { getClientIp } from "@/lib/server/client-ip";
import { db } from "@/lib/server/db";
import { getCurrentActor } from "@/lib/server/get-current-actor";
import { json, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { newToken } from "@/lib/server/token";
import { createSplitSchema } from "@/lib/split-schemas";

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) return json({ error: "Unauthorized" }, 401);

  const splits = await db.split.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { people: true, items: true } },
      payments: { where: { status: "PAID" }, select: { id: true } },
    },
  });

  return json({
    splits: splits.map((s) => ({
      id: s.id,
      title: s.title,
      restaurantName: s.restaurantName,
      mode: s.mode,
      peopleCount: s._count.people,
      itemCount: s._count.items,
      outstandingCount: s._count.people - s.payments.length,
      shareUrl: `/p/${s.shareToken}`,
      createdAt: s.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const actor = await getCurrentActor();
  if (!actor) return json({ error: "Unauthorized" }, 401);

  const rateLimit = await checkRateLimit(`create-split:${getClientIp(request)}`, { limit: 20, windowSeconds: 3600 });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many splits created — try again in a bit." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = await parseJsonBody(request, createSplitSchema);
  if (!body.ok) return body.response;

  const { title, restaurantName, peopleNames } = body.data;
  const split = await db.split.create({
    data: {
      userId: actor.id,
      title,
      restaurantName,
      // The payer link credential: 128-bit, never a cuid.
      shareToken: newToken(),
      people: { create: peopleNames.map((name) => ({ name })) },
    },
    include: { people: true },
  });

  return json(
    {
      id: split.id,
      title: split.title,
      organizerUrl: `/split/${split.id}`,
      shareUrl: `/p/${split.shareToken}`,
      people: split.people,
    },
    201,
  );
}
