import "server-only";
import { db } from "./db";
import { getCurrentActor } from "./get-current-actor";
import { json, notFound } from "./http";

/**
 * Every /api/splits/[id]/* route calls this first: resolves the actor, then
 * checks they own the split. 404 (not 403) for someone else's split, so ids
 * can't be probed.
 */
export async function requireSplitOwner(splitId: string) {
  const actor = await getCurrentActor();
  if (!actor) return { error: json({ error: "Unauthorized" }, 401) } as const;

  const split = await db.split.findUnique({ where: { id: splitId } });
  if (!split || split.userId !== actor.id) return { error: notFound() } as const;

  return { split, userId: actor.id } as const;
}
