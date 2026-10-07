import { describe, expect, it } from "vitest";
import { parseCspReport, redactUrl } from "./csp-report";

describe("redactUrl", () => {
  it("masks payer share tokens and drops the query string", () => {
    expect(redactUrl("https://tabmath.com/p/abc123secret?x=1#y")).toBe("https://tabmath.com/p/[token]");
  });

  it("masks split ids", () => {
    expect(redactUrl("https://tabmath.com/split/cl123/edit")).toBe("https://tabmath.com/split/[id]/edit");
  });

  it("passes CSP keywords through", () => {
    expect(redactUrl("inline")).toBe("inline");
    expect(redactUrl("eval")).toBe("eval");
  });

  it("handles a missing value", () => {
    expect(redactUrl(undefined)).toBe("unknown");
  });
});

describe("parseCspReport", () => {
  it("reads the legacy report-uri format (Safari, Firefox)", () => {
    const report = {
      "csp-report": {
        "document-uri": "https://tabmath.com/p/secret",
        "violated-directive": "img-src",
        "effective-directive": "img-src",
        "blocked-uri": "https://example.com/a.png?sig=1",
      },
    };
    expect(parseCspReport(report)).toEqual([
      { directive: "img-src", blocked: "https://example.com/a.png", page: "https://tabmath.com/p/[token]" },
    ]);
  });

  it("reads the Reporting API format (Chromium) and skips other report types", () => {
    const reports = [
      {
        type: "csp-violation",
        body: {
          effectiveDirective: "script-src-elem",
          blockedURL: "https://evil.example/x.js",
          documentURL: "https://tabmath.com/splits",
        },
      },
      { type: "deprecation", body: {} },
    ];
    expect(parseCspReport(reports)).toEqual([
      { directive: "script-src-elem", blocked: "https://evil.example/x.js", page: "https://tabmath.com/splits" },
    ]);
  });

  it("returns nothing for junk input", () => {
    expect(parseCspReport("hello")).toEqual([]);
    expect(parseCspReport({ foo: 1 })).toEqual([]);
    expect(parseCspReport(null)).toEqual([]);
  });
});
