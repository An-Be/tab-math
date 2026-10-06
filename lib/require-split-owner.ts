import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentActor } from "@/lib/get-current-actor";

export async function requireSplitOwner(splitId: string) {
  const actor = await getCurrentActor();
  if (!actor) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const split = await prisma.split.findUnique({ where: { id: splitId } });
  if (!split || split.userId !== actor.id) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  }

  return { split, userId: actor.id } as const;
}
