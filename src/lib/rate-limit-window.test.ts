import { describe, expect, it } from "vitest";
import { retryAfterSeconds, windowStartFor } from "./rate-limit-window";

describe("windowStartFor", () => {
  it("floors to the window boundary", () => {
    const t = Date.UTC(2026, 0, 1, 10, 37, 12);
    expect(windowStartFor(t, 600).toISOString()).toBe("2026-01-01T10:30:00.000Z");
    expect(windowStartFor(t, 3600).toISOString()).toBe("2026-01-01T10:00:00.000Z");
  });

  it("puts two requests in the same window together", () => {
    const a = Date.UTC(2026, 0, 1, 10, 30, 1);
    const b = Date.UTC(2026, 0, 1, 10, 39, 59);
    expect(windowStartFor(a, 600).getTime()).toBe(windowStartFor(b, 600).getTime());
  });
});

describe("retryAfterSeconds", () => {
  it("counts down to the end of the window, never below 1", () => {
    const start = new Date(Date.UTC(2026, 0, 1, 10, 30, 0));
    expect(retryAfterSeconds(start.getTime() + 1000, start, 600)).toBe(599);
    expect(retryAfterSeconds(start.getTime() + 600_000, start, 600)).toBe(1);
  });
});
