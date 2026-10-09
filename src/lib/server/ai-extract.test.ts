import { afterEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  // Must be a real function (not an arrow fn) since ai-extract.ts calls
  // `new GoogleGenAI(...)` — arrow functions can't be constructors.
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI() {
    return { models: { generateContent } };
  }),
}));

vi.mock("sharp", () => ({ default: vi.fn() }));

const validReceiptJson = JSON.stringify({
  items: [{ label: "Burger", priceCents: 1495, quantity: 1 }],
  taxCents: 100,
  tipCents: null,
});

describe("extractLineItems — model fallback on repeated failure", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("succeeds on the first call without touching the fallback model", async () => {
    const { extractLineItems } = await import("./ai-extract");
    generateContent.mockResolvedValueOnce({ text: validReceiptJson });

    const result = await extractLineItems("base64", "image/jpeg");

    expect(result.ok).toBe(true);
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(generateContent.mock.calls[0][0].model).toBe("gemini-3.8-flash");
  });

  it("skips straight to the fallback model when the primary is overloaded (503)", async () => {
    const { extractLineItems } = await import("./ai-extract");
    generateContent
      .mockRejectedValueOnce(new Error("503 UNAVAILABLE"))
      .mockResolvedValueOnce({ text: validReceiptJson });

    const result = await extractLineItems("base64", "image/jpeg");

    expect(result.ok).toBe(true);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[0][0].model).toBe("gemini-3.8-flash");
    expect(generateContent.mock.calls[1][0].model).toBe("gemini-3.5-flash-lite");
  });

  it("treats the SDK's ApiError status as overload too (504 deadline exceeded)", async () => {
    const { extractLineItems } = await import("./ai-extract");
    const deadline = Object.assign(new Error('{"error":{"code":504}}'), { name: "ApiError", status: 504 });
    generateContent.mockRejectedValueOnce(deadline).mockResolvedValueOnce({ text: validReceiptJson });

    const result = await extractLineItems("base64", "image/jpeg");

    expect(result.ok).toBe(true);
    expect(generateContent.mock.calls[1][0].model).toBe("gemini-3.5-flash-lite");
  });

  it("still retries the primary once for errors that aren't overload", async () => {
    const { extractLineItems } = await import("./ai-extract");
    generateContent
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce({ text: validReceiptJson });

    const result = await extractLineItems("base64", "image/jpeg");

    expect(result.ok).toBe(true);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[1][0].model).toBe("gemini-3.8-flash");
  });

  it("caps every Gemini call with a timeout so a stalled request can't hang the route", async () => {
    const { extractLineItems, GEMINI_CALL_TIMEOUT_MS } = await import("./ai-extract");
    generateContent
      .mockRejectedValueOnce(new Error("Request timed out"))
      .mockResolvedValueOnce({ text: validReceiptJson });

    const result = await extractLineItems("base64", "image/jpeg");

    expect(result.ok).toBe(true);
    expect(generateContent).toHaveBeenCalledTimes(2);
    for (const [request] of generateContent.mock.calls) {
      expect(request.config.httpOptions.timeout).toBe(GEMINI_CALL_TIMEOUT_MS);
    }
  });

  it("gives up gracefully when every model and attempt fails", async () => {
    const { extractLineItems } = await import("./ai-extract");
    generateContent.mockRejectedValue(new Error("503 UNAVAILABLE"));

    const result = await extractLineItems("base64", "image/jpeg");

    expect(result.ok).toBe(false);
    // Primary: 1 attempt (overload skips its retry). Fallback: both attempts,
    // since there's nowhere left to go.
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it("falls back on unparseable responses too, not just thrown errors", async () => {
    const { extractLineItems } = await import("./ai-extract");
    generateContent
      .mockResolvedValueOnce({ text: "not json at all" })
      .mockResolvedValueOnce({ text: "still not json" })
      .mockResolvedValueOnce({ text: validReceiptJson });

    const result = await extractLineItems("base64", "image/jpeg");

    expect(result.ok).toBe(true);
    expect(generateContent.mock.calls[2][0].model).toBe("gemini-3.5-flash-lite");
  });
});
