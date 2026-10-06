import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

// Allowlist rather than a free-text field — this is a fully public,
// unauthenticated endpoint, so it must not become a place to write arbitrary
// strings into the database.
const FEATURES = ["self-claim-items"] as const;

const bodySchema = z.object({
  feature: z.enum(FEATURES),
});

export async function POST(request: Request) {
  const ip = await getClientIp();
  const rateLimit = await checkRateLimit(`feature-interest:${ip}`, {
    limit: 5,
    windowSeconds: 3600,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.featureInterest.create({ data: { feature: parsed.data.feature } });

  return NextResponse.json({ ok: true }, { status: 201 });
}
