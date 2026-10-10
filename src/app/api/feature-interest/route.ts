import { z } from "zod";
import { getClientIp } from "@/lib/server/client-ip";
import { db } from "@/lib/server/db";
import { json, parseJsonBody, rejectCrossSite, tooManyRequests } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/rate-limit";

// Allowlist rather than a free-text field — this is a fully public,
// unauthenticated endpoint, so it must not become a place to write arbitrary
// strings into the database.
const FEATURES = ["self-claim-items"] as const;

const bodySchema = z.object({
  feature: z.enum(FEATURES, { error: "Unknown feature." }),
});

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const rateLimit = await checkRateLimit(`feature-interest:${getClientIp(request)}`, { limit: 5, windowSeconds: 3600 });
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  await db.featureInterest.create({ data: { feature: body.data.feature } });

  return json({ ok: true }, 201);
}
