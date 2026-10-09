import { describe, expect, it } from "vitest";
import { isWellFormedToken, newToken } from "./token";

describe("newToken", () => {
  it("is 22 base62 characters", () => {
    for (let i = 0; i < 200; i++) expect(newToken()).toMatch(/^[0-9A-Za-z]{22}$/);
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 5000 }, newToken));
    expect(seen.size).toBe(5000);
  });

  it("passes its own format check", () => {
    expect(isWellFormedToken(newToken())).toBe(true);
  });
});

describe("isWellFormedToken", () => {
  it("rejects non-strings, short values and symbols", () => {
    expect(isWellFormedToken(undefined)).toBe(false);
    expect(isWellFormedToken(123)).toBe(false);
    expect(isWellFormedToken("short")).toBe(false);
    expect(isWellFormedToken("a".repeat(33))).toBe(false);
    expect(isWellFormedToken("abc-def_ghi.jkl/mnop")).toBe(false);
    expect(isWellFormedToken("../../../etc/passwd00")).toBe(false);
  });
});
