import "server-only";

/**
 * Best-effort client IP for rate-limit keys. Vercel sets x-forwarded-for;
 * plain local dev doesn't, where "local" is fine (no adversarial traffic).
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}
