import { prisma } from "@/lib/prisma";

type RateLimitOptions = {
  /** Max requests allowed within the window. */
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Fixed-window rate limit backed by a single atomic upsert, so it's safe
 * under concurrent requests without needing a lock. `key` should already
 * identify what's being limited (e.g. "extract:1.2.3.4").
 */
export async function checkRateLimit(
  key: string,
  { limit, windowSeconds }: RateLimitOptions
): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const hit = await prisma.rateLimitHit.upsert({
    where: { key_windowStart: { key, windowStart } },
    update: { count: { increment: 1 } },
    create: { key, windowStart, count: 1 },
  });

  // Opportunistic cleanup of old windows so the table doesn't grow forever —
  // cheap to skip most of the time rather than doing it on every request.
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.rateLimitHit.deleteMany({ where: { windowStart: { lt: cutoff } } });
  }

  if (hit.count > limit) {
    const retryAfterSeconds = Math.ceil((windowStart.getTime() + windowMs - Date.now()) / 1000);
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true };
}
