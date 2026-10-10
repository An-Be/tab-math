import { describe, expect, it } from "vitest";
import { buildCsp, mergeDirectives, newNonce } from "./csp";

describe("buildCsp", () => {
  it("is strict in production: nonce scripts, no eval, nonce styles", () => {
    const csp = buildCsp("abc", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("style-src 'self' 'nonce-abc'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toMatch(/upgrade-insecure-requests$/);
  });

  it("allows eval and inline styles only in dev", () => {
    const csp = buildCsp("abc", true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("merges per-tool origins without dropping defaults or duplicating", () => {
    const merged = mergeDirectives(
      { "img-src": ["'self'", "data:"] },
      { "img-src": ["data:", "https://cdn.example"], "connect-src": ["https://api.example"] },
    );
    expect(merged["img-src"]).toEqual(["'self'", "data:", "https://cdn.example"]);
    expect(merged["connect-src"]).toEqual(["https://api.example"]);
  });
});

describe("newNonce", () => {
  it("is unique and base64", () => {
    const a = newNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(a).not.toBe(newNonce());
  });
});
