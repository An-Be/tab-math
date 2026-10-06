import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentActor } from "@/lib/get-current-actor";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

const createSplitSchema = z.object({
  title: z.string().trim().min(1).max(200),
  restaurantName: z.string().trim().max(200).optional(),
  peopleNames: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
});

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const splits = await prisma.split.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { people: true, items: true } },
      payments: { where: { status: "PAID" }, select: { id: true } },
    },
  });

  return NextResponse.json({
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
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = await getClientIp();
  const rateLimit = await checkRateLimit(`create-split:${ip}`, { limit: 20, windowSeconds: 3600 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many splits created — try again in a bit." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSplitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, restaurantName, peopleNames } = parsed.data;
  const split = await prisma.split.create({
    data: {
      userId: actor.id,
      title,
      restaurantName,
      people: {
        create: peopleNames.map((name) => ({ name })),
      },
    },
    include: { people: true },
  });

  return NextResponse.json(
    {
      id: split.id,
      title: split.title,
      organizerUrl: `/split/${split.id}`,
      shareUrl: `/p/${split.shareToken}`,
      people: split.people,
    },
    { status: 201 }
  );
}
