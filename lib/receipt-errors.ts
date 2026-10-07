/**
 * Messages the receipt uploader shows the organizer. Raw errors (Safari's
 * "The string did not match the expected pattern" when a timeout returns an
 * HTML error page instead of JSON, SDK internals, stack-ish text) never reach
 * the screen; only these, or a message our own API wrote for people.
 */
export const RECEIPT_MESSAGES = {
  uploadFailed: "Couldn't upload that photo. Check your connection and try again.",
  // Thrown by the upload middleware (app/api/uploadthing/core.ts) and passed
  // through to the client as-is, so it lives here for both sides to share.
  uploadRateLimited: "Too many uploads — try again in a bit.",
  tooSlow: "Reading the receipt took too long. Try again, or add the items below by hand.",
  generic: "Couldn't read the receipt. Try again, or add the items below by hand.",
} as const;

/**
 * Pick the message for a failed POST /api/splits/[id]/extract.
 *
 * The route writes a people-facing sentence in `{ error }` for exactly two
 * statuses: 429 (rate limit) and 400 when the uploaded photo can't be loaded.
 * Only those pass through. Other bodies ("Not found", "Unauthorized", a
 * validation object, an HTML page from a platform timeout) get a message
 * chosen by status instead.
 */
const PASS_THROUGH_STATUSES = new Set([400, 429]);

export function extractErrorMessage(status: number, body: unknown): string {
  const apiMessage =
    typeof body === "object" && body !== null && "error" in body ? (body as { error: unknown }).error : undefined;
  if (PASS_THROUGH_STATUSES.has(status) && typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage;
  }
  if (status === 504 || status === 408) return RECEIPT_MESSAGES.tooSlow;
  return RECEIPT_MESSAGES.generic;
}

/** Parse a response body as JSON without throwing; null if it isn't JSON. */
export async function readJsonSafely(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
