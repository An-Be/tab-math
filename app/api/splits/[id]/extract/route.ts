import { SeverityNumber } from "@opentelemetry/api-logs";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSplitOwner } from "@/lib/require-split-owner";
import { downscaleAndHash, extractLineItems } from "@/lib/ai-extract";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { posthogLogExporter, posthogLoggerProvider } from "@/instrumentation";

// Explicit ceiling, above the worst case of every Gemini attempt timing out
// (see GEMINI_CALL_TIMEOUT_MS in lib/ai-extract.ts), so the route always
// gets to answer the client instead of being killed mid-retry.
export const maxDuration = 120;

const extractSchema = z.object({
  imageUrl: z.string().url(),
});

function flushPostHogLogs() {
  after(async () => {
    await posthogLoggerProvider?.forceFlush();
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) {
    console.warn(`[extract] rejected: no actor or split not owned by caller (${result.error?.status ?? "unknown"})`);
    return result.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = extractSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("[extract] rejected: invalid request body");
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { imageUrl } = parsed.data;

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    console.warn(`[extract] could not fetch uploaded image: HTTP ${imageResponse.status}`);
    return NextResponse.json({ error: "Couldn't load that photo. Try uploading it again." }, { status: 400 });
  }
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const { base64, mediaType, sha256 } = await downscaleAndHash(imageBuffer);

  // Idempotent: re-extracting the same photo doesn't re-call the model or duplicate items.
  if (result.split.receiptImageSha === sha256) {
    const items = await prisma.lineItem.findMany({
      where: { splitId: id },
      orderBy: { sortOrder: "asc" },
    });
    if (items.length > 0) {
      return NextResponse.json({
        ok: true,
        items,
        taxCents: result.split.taxCents,
        tipCents: result.split.tipCents,
      });
    }
  }

  // Only the real Gemini calls below count against the limit — a cache hit
  // above already returned, so a photo already extracted doesn't cost quota.
  const ip = await getClientIp();
  const rateLimit = await checkRateLimit(`extract:${ip}`, { limit: 10, windowSeconds: 600 });
  if (!rateLimit.allowed) {
    console.warn("[extract] rate limited");
    posthogLogExporter?.emit({
      body: "receipt extraction rate limited",
      severityNumber: SeverityNumber.WARN,
      attributes: {
        event: "receipt_extraction_completed",
        endpoint: "/api/splits/:id/extract",
        outcome: "rate_limited",
        retry_after_seconds: rateLimit.retryAfterSeconds,
        posthogDistinctId: result.userId,
      },
    });
    flushPostHogLogs();
    return NextResponse.json(
      { error: "Too many receipt scans — try again in a bit." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const extraction = await extractLineItems(base64, mediaType, id, result.userId);

  if (!extraction.ok) {
    console.warn("[extract] failed after all model attempts (see attempt lines above)");
    posthogLogExporter?.emit({
      body: "receipt extraction completed",
      severityNumber: SeverityNumber.ERROR,
      attributes: {
        event: "receipt_extraction_completed",
        endpoint: "/api/splits/:id/extract",
        outcome: "failed",
        posthogDistinctId: result.userId,
      },
    });
    flushPostHogLogs();
    await prisma.split.update({ where: { id }, data: { receiptImageUrl: imageUrl } });
    return NextResponse.json({ ok: false, rawText: extraction.rawText });
  }

  const { items: extractedItems, taxCents, tipCents } = extraction.receipt;

  const items = await prisma.$transaction(async (tx) => {
    await tx.lineItem.deleteMany({ where: { splitId: id } });
    await tx.split.update({
      where: { id },
      data: {
        receiptImageUrl: imageUrl,
        receiptImageSha: sha256,
        ...(taxCents !== null ? { taxCents } : {}),
        ...(tipCents !== null ? { tipCents } : {}),
      },
    });
    await tx.lineItem.createMany({
      data: extractedItems.map((item, i) => ({
        splitId: id,
        label: item.label,
        priceCents: item.priceCents,
        quantity: item.quantity,
        sortOrder: i,
      })),
    });
    return tx.lineItem.findMany({ where: { splitId: id }, orderBy: { sortOrder: "asc" } });
  });

  posthogLogExporter?.emit({
    body: "receipt extraction completed",
    severityNumber: SeverityNumber.INFO,
    attributes: {
      event: "receipt_extraction_completed",
      endpoint: "/api/splits/:id/extract",
      outcome: "succeeded",
      extracted_item_count: extractedItems.length,
      tax_detected: taxCents !== null,
      tip_detected: tipCents !== null,
      posthogDistinctId: result.userId,
    },
  });
  flushPostHogLogs();

  return NextResponse.json({
    ok: true,
    items,
    taxCents: taxCents ?? result.split.taxCents,
    tipCents: tipCents ?? result.split.tipCents,
  });
}
