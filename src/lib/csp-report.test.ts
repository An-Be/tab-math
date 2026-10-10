import { describe, expect, it } from "vitest";
import { parseCspReport, redactUrl } from "./csp-report";

describe("redactUrl", () => {
  it("masks secret link segments and drops the query string", () => {
    expect(redactUrl("https://tool.example/t/abc123secret?x=1#y", ["/t/"])).toBe("https://tool.example/t/[secret]");
  });

  it("keeps the path after the secret", () => {
    expect(redactUrl("https://tool.example/api/spaces/abc/rotate", ["/api/spaces/"])).toBe(
      "https://tool.example/api/spaces/[secret]/rotate",
    );
  });

  it("passes CSP keywords through and handles missing values", () => {
    expect(redactUrl("inline")).toBe("inline");
    expect(redactUrl(undefined)).toBe("unknown");
  });
});

describe("parseCspReport", () => {
  it("reads the legacy report-uri format", () => {
    const report = {
      "csp-report": {
        "document-uri": "https://tool.example/t/secret",
        "effective-directive": "img-src",
        "blocked-uri": "https://cdn.example/a.png?sig=1",
      },
    };
    expect(parseCspReport(report, ["/t/"])).toEqual([
      { directive: "img-src", blocked: "https://cdn.example/a.png", page: "https://tool.example/t/[secret]" },
    ]);
  });

  it("reads the Reporting API format and skips other report types", () => {
    const reports = [
      { type: "deprecation", body: {} },
      { type: "csp-violation", body: { effectiveDirective: "script-src-elem", blockedURL: "inline", documentURL: "https://tool.example/" } },
    ];
    expect(parseCspReport(reports, ["/t/"])).toEqual([{ directive: "script-src-elem", blocked: "inline", page: "https://tool.example/" }]);
  });

  it("returns nothing for junk", () => {
    expect(parseCspReport({ hello: "world" })).toEqual([]);
    expect(parseCspReport(null)).toEqual([]);
  });
});
