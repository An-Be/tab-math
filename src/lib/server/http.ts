import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";

export const DEFAULT_MAX_BODY_BYTES = 4 * 1024;

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const notFound = () => json({ error: "Not found" }, 404);
export const badRequest = (error: string) => json({ error }, 400);
export const tooManyRequests = (retryAfterSeconds: number) =>
  NextResponse.json(
    { error: "Too many requests. Try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );

function requestHost(req: Request): string | null {
  return req.headers.get("x-forwarded-host") ?? req.headers.get("host");
}

function originMatchesHost(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = requestHost(req);
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * CSRF guard for every mutating route. Call it first.
 * - Sec-Fetch-Site, when the browser sends it, must be same-origin.
 * - Origin, when sent, must match this host.
 * - Requests with a body must be application/json, which forces a CORS
 *   preflight for any cross-site caller (blocks form and text/plain CSRF).
 */
export function rejectCrossSite(req: Request, { hasBody = true } = {}): NextResponse | null {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return json({ error: "Forbidden" }, 403);
  if (!originMatchesHost(req)) return json({ error: "Forbidden" }, 403);
  if (!hasBody) return null;
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().startsWith("application/json")) {
    return json({ error: "Expected application/json." }, 415);
  }
  return null;
}

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * Reads a size-capped JSON body and validates it with a Zod schema.
 * On failure it returns 400 with the first issue's message, so give every
 * field a user-facing message in the schema (`{ error: "..." }`).
 * Zod object schemas strip unknown keys, which is what blocks mass assignment;
 * never switch a schema to .passthrough() or .loose().
 */
export async function parseJsonBody<S extends z.ZodType>(
  req: Request,
  schema: S,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<ParsedBody<z.infer<S>>> {
  const raw = await req.text().catch(() => "");
  if (raw.length > maxBytes) return { ok: false, response: json({ error: "Request too large." }, 413) };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, response: badRequest("Invalid JSON.") };
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, response: badRequest(parsed.error.issues[0]?.message ?? "Invalid request.") };
  }
  return { ok: true, data: parsed.data };
}
