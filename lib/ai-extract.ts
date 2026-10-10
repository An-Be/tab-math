import { GoogleGenAI } from "@google/genai";
import { PostHogGoogleGenAI } from "@posthog/ai/gemini";
import { PostHog } from "posthog-node";
import sharp from "sharp";
import { createHash, randomUUID } from "crypto";

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!posthogToken && process.env.NODE_ENV === "development") {
  throw new Error(
    "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured"
  );
}

if (!posthogHost && process.env.NODE_ENV === "development") {
  throw new Error(
    "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured"
  );
}

const posthog =
  posthogToken && posthogHost
    ? new PostHog(posthogToken, {
        host: posthogHost,
        flushAt: 1,
        flushInterval: 0,
        enableExceptionAutocapture: true,
        privacyMode: false,
      })
    : null;

const observedClient = posthog
  ? new PostHogGoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, posthog })
  : null;
const baseClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MAX_DIMENSION = 1568;
// Primary, then a sibling model as a fallback if the primary keeps failing —
// a different model is often a separate capacity pool, so a demand spike
// that 503s one doesn't necessarily affect the other. Both verified to
// support image input + responseJsonSchema before being wired in here.
const MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"] as const;
// Per-call cap. Without it a stalled Gemini request hangs until Vercel kills
// the whole function, and the organizer stares at a spinner for minutes.
// Worst case across every attempt: 4 x 20s + ~2s of backoff (only when the
// primary fails in ways that aren't overload), under the route's maxDuration.
export const GEMINI_CALL_TIMEOUT_MS = 20_000;

export type ExtractedLineItem = {
  label: string;
  priceCents: number;
  quantity: number;
};

export type ExtractedReceipt = {
  items: ExtractedLineItem[];
  taxCents: number | null;
  tipCents: number | null;
};

export type ExtractResult =
  | { ok: true; receipt: ExtractedReceipt }
  | { ok: false; rawText: string };

const EXTRACTION_PROMPT = `You are reading a restaurant receipt photo. Extract:

1. "items": every purchasable line item (food, drinks, etc). Do NOT include tax, tip, gratuity, service charge, subtotal, or total lines as items — those are reported separately below.
   - "priceCents" is the line's unit price in integer cents (no decimals, no currency symbols).
   - "quantity" is the integer quantity for that line (default 1 if not shown).
   - "label" is a short human-readable name for the item.
2. "taxCents": the printed tax amount, in integer cents. Use null if no tax line is printed on the receipt.
3. "tipCents": the printed tip/gratuity amount, in integer cents. Use null if no tip line is printed (most receipts don't have one — the customer adds it later, that's expected).`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          priceCents: { type: "integer" },
          quantity: { type: "integer" },
        },
        required: ["label", "priceCents", "quantity"],
      },
    },
    taxCents: { anyOf: [{ type: "integer" }, { type: "null" }] },
    tipCents: { anyOf: [{ type: "integer" }, { type: "null" }] },
  },
  required: ["items", "taxCents", "tipCents"],
};

export async function downscaleAndHash(
  imageBuffer: Buffer
): Promise<{ base64: string; mediaType: "image/jpeg"; sha256: string }> {
  const resized = await sharp(imageBuffer)
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  return {
    base64: resized.toString("base64"),
    mediaType: "image/jpeg",
    sha256: createHash("sha256").update(imageBuffer).digest("hex"),
  };
}

function parseCents(value: unknown): number | null {
  return Number.isFinite(value) && (value as number) >= 0 ? Math.round(value as number) : null;
}

function parseReceipt(text: string): ExtractedReceipt | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || !Array.isArray(parsed.items)) return null;
    const items = parsed.items
      .filter(
        (i: { label?: unknown; priceCents?: unknown }) =>
          typeof i?.label === "string" &&
          Number.isFinite(i?.priceCents) &&
          (i.priceCents as number) >= 0
      )
      .map((i: { label: string; priceCents: number; quantity?: unknown }) => ({
        label: String(i.label).slice(0, 200),
        priceCents: Math.round(i.priceCents),
        quantity: Number.isFinite(i.quantity) && (i.quantity as number) > 0 ? Math.round(i.quantity as number) : 1,
      }));
    return {
      items,
      taxCents: parseCents(parsed.taxCents),
      tipCents: parseCents(parsed.tipCents),
    };
  } catch {
    return null;
  }
}

/**
 * "This model is busy" errors: overloaded (503 UNAVAILABLE), rate limited
 * (429 RESOURCE_EXHAUSTED), or too slow (504 DEADLINE_EXCEEDED, our own
 * timeout). Retrying the same model right away rarely helps, while the
 * fallback is a separate capacity pool, so these skip straight to it.
 */
function isOverloadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const status = (err as { status?: unknown }).status;
  if (status === 429 || status === 503 || status === 504) return true;
  if (err.name === "AbortError" || err.name === "TimeoutError") return true;
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|DEADLINE_EXCEEDED|high demand|timed? ?out/i.test(err.message);
}

/** Error summary safe to log: the message only, capped, with anything that
 * looks like an API key masked in case an SDK ever echoes a request URL. */
function describeError(err: unknown): string {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return message.replace(/key=[^&\s"]+/gi, "key=[redacted]").slice(0, 300);
}

export async function extractLineItems(
  base64Image: string,
  mediaType: "image/jpeg",
  splitId?: string,
  actorId?: string
): Promise<ExtractResult> {
  // Each receipt scan is a turn. Retries and fallback calls share its trace,
  // while every scan of this split is grouped in the same AI session.
  const traceId = randomUUID();

  const call = (model: string) => {
    const request = {
      model,
      contents: [
        {
          role: "user" as const,
          parts: [
            { inlineData: { mimeType: mediaType, data: base64Image } },
            { text: EXTRACTION_PROMPT },
          ],
        },
      ],
      config: {
        httpOptions: { timeout: GEMINI_CALL_TIMEOUT_MS },
        responseMimeType: "application/json" as const,
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    };

    if (observedClient && splitId && actorId) {
      return observedClient.models.generateContent({
        ...request,
        posthogDistinctId: actorId,
        posthogTraceId: traceId,
        posthogProperties: { $ai_session_id: `split:${splitId}` },
      });
    }

    return baseClient.models.generateContent(request);
  };

  const attemptsPerModel = 2;
  let lastError: unknown;
  let lastText = "";

  for (const model of MODELS) {
    const isLastModel = model === MODELS[MODELS.length - 1];
    for (let attempt = 0; attempt < attemptsPerModel; attempt++) {
      const startedAt = Date.now();
      let skipToNextModel = false;
      try {
        const response = await call(model);
        const text = response.text ?? "";
        const receipt = parseReceipt(text);
        if (receipt) {
          console.info(`[extract] ${model} attempt ${attempt + 1}: ok in ${Date.now() - startedAt}ms`);
          await posthog?.flush();
          return { ok: true, receipt };
        }
        lastText = text;
        // Length only, never the text itself: it's the contents of someone's
        // receipt.
        console.warn(
          `[extract] ${model} attempt ${attempt + 1}: unparseable response (${text.length} chars) after ${Date.now() - startedAt}ms`
        );
      } catch (err) {
        // Transient upstream errors (503 "high demand", rate limits, network
        // blips, our own timeout) throw instead of returning malformed text —
        // back off and retry those too, not just unparseable responses.
        lastError = err;
        skipToNextModel = !isLastModel && isOverloadError(err);
        console.warn(
          `[extract] ${model} attempt ${attempt + 1}: ${describeError(err)} after ${Date.now() - startedAt}ms` +
            (skipToNextModel ? ", switching to fallback model" : "")
        );
      }
      if (skipToNextModel) break;
      const isLastAttemptOverall =
        model === MODELS[MODELS.length - 1] && attempt === attemptsPerModel - 1;
      if (!isLastAttemptOverall) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }
  await posthog?.flush();
  return { ok: false, rawText: lastText || (lastError instanceof Error ? lastError.message : "") };
}
