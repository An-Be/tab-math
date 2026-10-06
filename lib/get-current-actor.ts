import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { GUEST_COOKIE, GUEST_HEADER } from "@/lib/guest-session";

export type Actor = { id: string; isGuest: boolean };

/**
 * Same as prisma.user.upsert, but tolerant of a concurrent-create race: two
 * requests for the same brand-new user id (e.g. a few near-simultaneous
 * requests right after a Clerk SSO redirect) can both see "no row yet" and
 * both try to INSERT, so one gets a P2002 unique-constraint error on the
 * primary key even though upsert is supposed to make that impossible. We
 * never use the return value here — the row existing is all that matters —
 * so on that specific race, the loser just no-ops instead of 500ing.
 */
async function upsertUserTolerant(args: Parameters<typeof prisma.user.upsert>[0]) {
  try {
    await prisma.user.upsert(args);
  } catch (err) {
    const isConcurrentCreateRace =
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
    if (!isConcurrentCreateRace) throw err;
  }
}

/**
 * Resolves who's making the request: a real Clerk user, or — since
 * organizers can use the app without signing up — the guest identity that
 * `proxy.ts` assigns via a cookie. Lazily mirrors either into our User
 * table (no Clerk webhook needed for MVP).
 */
export async function getCurrentActor(): Promise<Actor | null> {
  const { userId } = await auth();
  if (userId) {
    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress;
    await upsertUserTolerant({
      where: { id: userId },
      update: email ? { email, isGuest: false } : { isGuest: false },
      create: { id: userId, email: email ?? `${userId}@pending.clerk`, isGuest: false },
    });
    return { id: userId, isGuest: false };
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const guestId = cookieStore.get(GUEST_COOKIE)?.value ?? headerStore.get(GUEST_HEADER) ?? undefined;
  if (!guestId) return null;

  await upsertUserTolerant({
    where: { id: guestId },
    update: {},
    create: { id: guestId, email: `${guestId}@guest.local`, isGuest: true },
  });
  return { id: guestId, isGuest: true };
}
