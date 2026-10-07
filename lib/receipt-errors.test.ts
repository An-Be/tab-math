import { describe, expect, it } from "vitest";
import { RECEIPT_MESSAGES, extractErrorMessage, readJsonSafely } from "./receipt-errors";

describe("extractErrorMessage", () => {
  it("passes through the route's rate-limit sentence", () => {
    expect(extractErrorMessage(429, { error: "Too many receipt scans — try again in a bit." })).toBe(
      "Too many receipt scans — try again in a bit."
    );
  });

  it("passes through the route's unloadable-photo sentence", () => {
    expect(extractErrorMessage(400, { error: "Couldn't load that photo. Try uploading it again." })).toBe(
      "Couldn't load that photo. Try uploading it again."
    );
  });

  it("hides terse auth/ownership errors", () => {
    expect(extractErrorMessage(404, { error: "Not found" })).toBe(RECEIPT_MESSAGES.generic);
    expect(extractErrorMessage(401, { error: "Unauthorized" })).toBe(RECEIPT_MESSAGES.generic);
  });

  it("hides a 400 validation object", () => {
    expect(extractErrorMessage(400, { error: { fieldErrors: { imageUrl: ["Invalid url"] } } })).toBe(
      RECEIPT_MESSAGES.generic
    );
  });

  it("explains a platform timeout that returned no JSON", () => {
    expect(extractErrorMessage(504, null)).toBe(RECEIPT_MESSAGES.tooSlow);
  });

  it("falls back to the generic message for a bare 500", () => {
    expect(extractErrorMessage(500, null)).toBe(RECEIPT_MESSAGES.generic);
  });
});

describe("readJsonSafely", () => {
  it("returns parsed JSON", async () => {
    expect(await readJsonSafely(new Response('{"ok":true}'))).toEqual({ ok: true });
  });

  it("returns null for an HTML error page instead of throwing", async () => {
    const html = new Response("<html>An error occurred with your deployment</html>", { status: 504 });
    expect(await readJsonSafely(html)).toBeNull();
  });
});
