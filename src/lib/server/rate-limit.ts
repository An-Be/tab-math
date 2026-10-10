import "server-only";
import { retryAfterSeconds, windowStartFor } from "@/lib/rate-limit-window";
import { db } from "./db";

export type RateLimitOptions = {
  /** Max requests allowed within the window. */
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Postgres-backed fixed-window rate limit: one atomic upsert-and-increment, so
 * it is race-free under concurrent requests without a lock. `key` names what is
 * being limited and who, e.g. `create:${ip}`. Key by IP, not by a guest or
 * session id, since those are free to regenerate.
 */
export async function checkRateLimit(key: string, { limit, windowSeconds }: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = windowStartFor(now, windowSeconds);

  const hit = await db.rateLimitHit.upsert({
    where: { key_windowStart: { key, windowStart } },
    update: { count: { increment: 1 } },
    create: { key, windowStart, count: 1 },
  });

  // Opportunistic cleanup so the table doesn't grow forever.
  if (Math.random() < 0.02) {
    const cutoff = new Date(now - 24 * 60 * 60 * 1000);
    await db.rateLimitHit.deleteMany({ where: { windowStart: { lt: cutoff } } });
  }

  if (hit.count > limit) return { allowed: false, retryAfterSeconds: retryAfterSeconds(now, windowStart, windowSeconds) };
  return { allowed: true };
}
