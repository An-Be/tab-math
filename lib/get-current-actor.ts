import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { GUEST_COOKIE, GUEST_HEADER } from "@/lib/guest-session";

export type Actor = { id: string; isGuest: boolean };

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
    await prisma.user.upsert({
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

  await prisma.user.upsert({
    where: { id: guestId },
    update: {},
    create: { id: guestId, email: `${guestId}@guest.local`, isGuest: true },
  });
  return { id: guestId, isGuest: true };
}
