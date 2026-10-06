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

  it("falls back to the sibling model when the primary keeps throwing (e.g. 503s)", async () => {
    const { extractLineItems } = await import("./ai-extract");
    generateContent
      .mockRejectedValueOnce(new Error("503 UNAVAILABLE"))
      .mockRejectedValueOnce(new Error("503 UNAVAILABLE"))
      .mockResolvedValueOnce({ text: validReceiptJson });

    const result = await extractLineItems("base64", "image/jpeg");

    expect(result.ok).toBe(true);
    expect(generateContent).toHaveBeenCalledTimes(3);
    // First two attempts on the primary model, third on the fallback.
    expect(generateContent.mock.calls[0][0].model).toBe("gemini-3.8-flash");
    expect(generateContent.mock.calls[1][0].model).toBe("gemini-3.8-flash");
    expect(generateContent.mock.calls[2][0].model).toBe("gemini-3.5-flash-lite");
  });

  it("gives up gracefully when every model and attempt fails", async () => {
    const { extractLineItems } = await import("./ai-extract");
    generateContent.mockRejectedValue(new Error("503 UNAVAILABLE"));

    const result = await extractLineItems("base64", "image/jpeg");

    expect(result.ok).toBe(false);
    // 2 attempts per model x 2 models = 4 total, never more.
    expect(generateContent).toHaveBeenCalledTimes(4);
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
