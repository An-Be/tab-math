import { isUploadthingFileUrl } from "@/lib/receipt-url";
import { downscaleAndHash, extractLineItems } from "@/lib/server/ai-extract";
import { getClientIp } from "@/lib/server/client-ip";
import { db } from "@/lib/server/db";
import { json, parseJsonBody, rejectCrossSite } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { requireSplitOwner } from "@/lib/server/require-split-owner";
import { extractSchema } from "@/lib/split-schemas";

// Explicit ceiling, above the worst case of every Gemini attempt timing out
// (see GEMINI_CALL_TIMEOUT_MS in src/lib/server/ai-extract.ts), so the route always
// gets to answer the client instead of being killed mid-retry.
export const maxDuration = 120;

const PHOTO_ERROR = "Couldn't load that photo. Try uploading it again.";

export async function POST(request: Request, { params }: RouteContext<"/api/splits/[id]/extract">) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const { id } = await params;
  const result = await requireSplitOwner(id);
  if ("error" in result) {
    console.warn(`[extract] rejected: no actor or split not owned by caller (${result.error?.status ?? "unknown"})`);
    return result.error;
  }

  const body = await parseJsonBody(request, extractSchema);
  if (!body.ok) {
    console.warn("[extract] rejected: invalid request body");
    return body.response;
  }
  const { imageUrl } = body.data;
  // The server fetches this URL, so it must be our own upload storage (no SSRF).
  if (!isUploadthingFileUrl(imageUrl)) {
    console.warn("[extract] rejected: image URL is not an Uploadthing file");
    return json({ error: PHOTO_ERROR }, 400);
  }

  // redirect: "error" so an allowed host can't bounce the fetch somewhere else.
  const imageResponse = await fetch(imageUrl, { redirect: "error" }).catch(() => null);
  if (!imageResponse?.ok) {
    console.warn(`[extract] could not fetch uploaded image: ${imageResponse ? `HTTP ${imageResponse.status}` : "network error"}`);
    return json({ error: PHOTO_ERROR }, 400);
  }
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const { base64, mediaType, sha256 } = await downscaleAndHash(imageBuffer);

  // Idempotent: re-extracting the same photo doesn't re-call the model or duplicate items.
  if (result.split.receiptImageSha === sha256) {
    const items = await db.lineItem.findMany({
      where: { splitId: id },
      orderBy: { sortOrder: "asc" },
    });
    if (items.length > 0) {
      return json({ ok: true, items, taxCents: result.split.taxCents, tipCents: result.split.tipCents });
    }
  }

  // Only the real Gemini calls below count against the limit — a cache hit
  // above already returned, so a photo already extracted doesn't cost quota.
  const rateLimit = await checkRateLimit(`extract:${getClientIp(request)}`, { limit: 10, windowSeconds: 600 });
  if (!rateLimit.allowed) {
    console.warn("[extract] rate limited");
    return Response.json(
      { error: "Too many receipt scans — try again in a bit." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const extraction = await extractLineItems(base64, mediaType);

  if (!extraction.ok) {
    console.warn("[extract] failed after all model attempts (see attempt lines above)");
    await db.split.update({ where: { id }, data: { receiptImageUrl: imageUrl } });
    return json({ ok: false, rawText: extraction.rawText });
  }

  const { items: extractedItems, taxCents, tipCents } = extraction.receipt;

  const items = await db.$transaction(async (tx) => {
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

  return json({
    ok: true,
    items,
    taxCents: taxCents ?? result.split.taxCents,
    tipCents: tipCents ?? result.split.tipCents,
  });
}
