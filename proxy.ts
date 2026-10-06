import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { GUEST_COOKIE, GUEST_HEADER } from "@/lib/guest-session";

// /splits, /split/* and their API routes work for guests too (no Clerk
// session required) — this sets/reads a guest_id cookie for them, and merges
// guest-owned splits onto the real account the moment they do sign up.
// A plain prefix check instead of Clerk's (deprecated) createRouteMatcher,
// since this is routing logic, not an authorization decision.
function needsActor(req: Request) {
  const path = new URL(req.url).pathname;
  return path.startsWith("/splits") || path.startsWith("/split/") || path.startsWith("/api/splits");
}

export default clerkMiddleware(async (auth, req) => {
  if (!needsActor(req)) return;

  const { userId } = await auth();
  const guestId = req.cookies.get(GUEST_COOKIE)?.value;

  if (userId && guestId) {
    await prisma.$transaction([
      prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@pending.clerk` },
      }),
      prisma.split.updateMany({ where: { userId: guestId }, data: { userId } }),
      prisma.user.deleteMany({ where: { id: guestId } }),
    ]);
    const res = NextResponse.next();
    res.cookies.delete(GUEST_COOKIE);
    return res;
  }

  if (userId || guestId) return;

  // Brand-new guest: forward the id via header so this same request's
  // render can see it immediately (the Set-Cookie below only takes effect
  // on the *next* request), and set the cookie for requests after that.
  const newGuestId = randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(GUEST_HEADER, newGuestId);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.cookies.set(GUEST_COOKIE, newGuestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return res;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Prerequisite for Clerk's optional same-origin frontendApiProxy
    // fallback (not currently enabled — see AGENTS.md). Harmless either
    // way: without this entry clerkMiddleware wouldn't even see requests
    // here (the static-file exclusion above ends in `js(?!on)`, which
    // also excludes this path), but our own callback no-ops on it
    // regardless, so it falls through to normal routing either way.
    "/__clerk/(.*)",
  ],
};
