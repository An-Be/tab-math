import { describe, expect, it } from "vitest";
import { buildPaymentOptions } from "./payment-links";

describe("buildPaymentOptions", () => {
  it("returns nothing for null/undefined/empty handles", () => {
    expect(buildPaymentOptions(null)).toEqual([]);
    expect(buildPaymentOptions(undefined)).toEqual([]);
    expect(buildPaymentOptions({})).toEqual([]);
  });

  it("builds a venmo.com link from a bare handle, stripping a leading @", () => {
    const [opt] = buildPaymentOptions({ venmo: "@andrea" });
    expect(opt).toEqual({ type: "venmo", label: "Venmo", href: "https://venmo.com/u/andrea" });
  });

  it("passes through a full venmo URL unchanged", () => {
    const [opt] = buildPaymentOptions({ venmo: "https://venmo.com/u/andrea-custom" });
    expect(opt).toHaveProperty("href", "https://venmo.com/u/andrea-custom");
  });

  it("builds a cash.app link from a bare cashtag, stripping a leading $", () => {
    const [opt] = buildPaymentOptions({ cashapp: "$andrea" });
    expect(opt).toEqual({ type: "cashapp", label: "Cash App", href: "https://cash.app/$andrea" });
  });

  it("passes through a full cash.app URL unchanged", () => {
    const [opt] = buildPaymentOptions({ cashapp: "https://cash.app/$already-a-link" });
    expect(opt).toHaveProperty("href", "https://cash.app/$already-a-link");
  });

  it("uses the organizer's pasted Stripe link verbatim, labeled 'card'", () => {
    const [opt] = buildPaymentOptions({ stripeLink: "https://buy.stripe.com/abc123" });
    expect(opt).toEqual({ type: "stripeLink", label: "card", href: "https://buy.stripe.com/abc123" });
  });

  it("zelle has no href — it's a value to copy, not a link", () => {
    const [opt] = buildPaymentOptions({ zelle: "andrea@example.com" });
    expect(opt).toEqual({ type: "zelle", label: "Zelle", value: "andrea@example.com" });
    expect(opt).not.toHaveProperty("href");
  });

  it("includes every configured method, in a stable order", () => {
    const options = buildPaymentOptions({
      venmo: "@a",
      cashapp: "$b",
      stripeLink: "https://buy.stripe.com/c",
      zelle: "d@example.com",
    });
    expect(options.map((o) => o.type)).toEqual(["venmo", "cashapp", "stripeLink", "zelle"]);
  });

  it("trims whitespace around a pasted handle", () => {
    const [opt] = buildPaymentOptions({ venmo: "  @andrea  " });
    expect(opt).toHaveProperty("href", "https://venmo.com/u/andrea");
  });
});
