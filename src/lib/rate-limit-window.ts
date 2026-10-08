// Pure fixed-window math for src/lib/server/rate-limit.ts, split out so it can be tested.

export function windowStartFor(nowMs: number, windowSeconds: number): Date {
  const windowMs = windowSeconds * 1000;
  return new Date(Math.floor(nowMs / windowMs) * windowMs);
}

export function retryAfterSeconds(nowMs: number, windowStart: Date, windowSeconds: number): number {
  return Math.max(1, Math.ceil((windowStart.getTime() + windowSeconds * 1000 - nowMs) / 1000));
}
