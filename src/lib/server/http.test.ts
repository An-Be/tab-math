import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseJsonBody, rejectCrossSite } from "./http";

function req(headers: Record<string, string>, body?: string) {
  return new Request("https://tool.example/api/x", { method: "POST", headers, body });
}

const base = { host: "tool.example", "content-type": "application/json" };

describe("rejectCrossSite", () => {
  it("allows same-origin JSON", () => {
    expect(rejectCrossSite(req({ ...base, origin: "https://tool.example", "sec-fetch-site": "same-origin" }))).toBeNull();
  });

  it("allows requests with no Origin (non-browser or same-origin GET-style)", () => {
    expect(rejectCrossSite(req(base))).toBeNull();
  });

  it("blocks a foreign Origin", () => {
    expect(rejectCrossSite(req({ ...base, origin: "https://evil.example" }))?.status).toBe(403);
  });

  it("blocks cross-site Sec-Fetch-Site", () => {
    expect(rejectCrossSite(req({ ...base, "sec-fetch-site": "cross-site" }))?.status).toBe(403);
  });

  it("blocks a malformed Origin", () => {
    expect(rejectCrossSite(req({ ...base, origin: "not a url" }))?.status).toBe(403);
  });

  it("requires JSON when the request has a body", () => {
    expect(rejectCrossSite(req({ host: "tool.example", "content-type": "text/plain" }))?.status).toBe(415);
  });

  it("skips the content-type check for bodyless requests", () => {
    expect(rejectCrossSite(req({ host: "tool.example" }), { hasBody: false })).toBeNull();
  });

  it("honors x-forwarded-host", () => {
    const r = req({ ...base, host: "internal:3000", "x-forwarded-host": "tool.example", origin: "https://tool.example" });
    expect(rejectCrossSite(r)).toBeNull();
  });
});

describe("parseJsonBody", () => {
  const schema = z.object({ title: z.string({ error: "Title is required." }).min(1, "Title is required.") });

  it("returns parsed data and strips unknown keys", async () => {
    const res = await parseJsonBody(req(base, JSON.stringify({ title: "a", isAdmin: true })), schema);
    expect(res).toEqual({ ok: true, data: { title: "a" } });
  });

  it("rejects oversize bodies with 413", async () => {
    const res = await parseJsonBody(req(base, JSON.stringify({ title: "x".repeat(100) })), schema, 50);
    expect(res.ok ? 0 : res.response.status).toBe(413);
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await parseJsonBody(req(base, "{nope"), schema);
    expect(res.ok ? 0 : res.response.status).toBe(400);
  });

  it("rejects schema failures with 400 and the field's message", async () => {
    const res = await parseJsonBody(req(base, JSON.stringify({ title: "" })), schema);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.response.status).toBe(400);
    expect(await res.response.json()).toEqual({ error: "Title is required." });
  });

  it("uses the field's message for a wrong type too", async () => {
    const res = await parseJsonBody(req(base, JSON.stringify({ title: 5 })), schema);
    expect(res.ok ? null : await res.response.json()).toEqual({ error: "Title is required." });
  });
});
