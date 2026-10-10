import { describe, expect, it } from "vitest";
import { posthogCsp, redactEvent, redactSecrets } from "./analytics";

const prefixes = ["/t/", "/api/spaces/"];
const token = "4JdAlcg30zoScSY6C2bTBA";

describe("redactSecrets", () => {
  it("redacts the secret segment of full URLs and keeps the rest of the path", () => {
    expect(redactSecrets(`https://app.test/t/${token}`, prefixes)).toBe("https://app.test/t/[secret]");
    expect(redactSecrets(`https://app.test/api/spaces/${token}/items`, prefixes)).toBe(
      "https://app.test/api/spaces/[secret]/items",
    );
  });

  it("drops fragments and query params except utm_*", () => {
    expect(redactSecrets(`https://app.test/t/${token}?as=abc&utm_source=ig#x`, prefixes)).toBe(
      "https://app.test/t/[secret]?utm_source=ig",
    );
    expect(redactSecrets("https://app.test/?ref=me", prefixes)).toBe("https://app.test/");
  });

  it("handles bare paths", () => {
    expect(redactSecrets(`/t/${token}`, prefixes)).toBe("/t/[secret]");
    expect(redactSecrets(`/t/${token}?today=2026-10-10`, prefixes)).toBe("/t/[secret]");
  });

  it("redacts links embedded in other strings and leaves plain values alone", () => {
    expect(redactSecrets(`go to https://app.test/t/${token} now`, prefixes)).toBe(
      "go to https://app.test/t/[secret] now",
    );
    expect(redactSecrets("Chrome", prefixes)).toBe("Chrome");
    expect(redactSecrets("/", prefixes)).toBe("/");
  });
});

describe("redactEvent", () => {
  it("redacts event and person properties, keeping non-strings", () => {
    const out = redactEvent(
      {
        uuid: "u",
        event: "$pageview",
        properties: {
          $current_url: `https://app.test/t/${token}`,
          $pathname: `/t/${token}`,
          $referrer: `https://app.test/t/${token}`,
          count: 3,
        },
        $set_once: { $initial_current_url: `https://app.test/t/${token}` },
      },
      prefixes,
    );
    expect(out?.properties).toEqual({
      $current_url: "https://app.test/t/[secret]",
      $pathname: "/t/[secret]",
      $referrer: "https://app.test/t/[secret]",
      count: 3,
    });
    expect(out?.$set_once).toEqual({ $initial_current_url: "https://app.test/t/[secret]" });
    expect(JSON.stringify(out)).not.toContain(token);
  });

  it("passes a dropped event through", () => {
    expect(redactEvent(null, prefixes)).toBeNull();
  });
});

describe("posthogCsp", () => {
  it("allows the ingest host and its assets host", () => {
    expect(posthogCsp("https://us.i.posthog.com")).toEqual({
      "connect-src": ["https://us.i.posthog.com", "https://us-assets.i.posthog.com"],
      "script-src": ["https://us-assets.i.posthog.com"],
    });
    expect(posthogCsp("https://eu.i.posthog.com/")["script-src"]).toEqual(["https://eu-assets.i.posthog.com"]);
  });

  it("uses a self-hosted or proxied host as is, and nothing when unset", () => {
    expect(posthogCsp("https://ph.example.com")).toEqual({
      "connect-src": ["https://ph.example.com"],
      "script-src": ["https://ph.example.com"],
    });
    expect(posthogCsp(undefined)).toEqual({});
    expect(posthogCsp("not a url")).toEqual({});
  });
});
