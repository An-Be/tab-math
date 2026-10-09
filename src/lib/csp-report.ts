import { z } from "zod";
import { secretPathPrefixes } from "@/config/routes";

export type CspViolation = { directive: string; blocked: string; page: string };

// Two wire formats reach the same endpoint:
// - report-uri (Safari, Firefox): one object, { "csp-report": {...} }
// - report-to (Chromium): an array of Reporting API reports
const legacySchema = z.object({
  "csp-report": z.object({
    "effective-directive": z.string().optional(),
    "violated-directive": z.string().optional(),
    "blocked-uri": z.string().optional(),
    "document-uri": z.string().optional(),
  }),
});

const reportingApiSchema = z.array(
  z.object({
    type: z.string(),
    body: z
      .object({
        effectiveDirective: z.string().optional(),
        blockedURL: z.string().optional(),
        documentURL: z.string().optional(),
      })
      .optional(),
  }),
);

const MAX_FIELD_LENGTH = 200;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reduces a URL to something safe to log. Secret-link segments are credentials,
 * so they never reach the logs; query strings and fragments are dropped too.
 * Non-URL values ("inline", "eval") pass through.
 */
export function redactUrl(value: string | undefined, prefixes: readonly string[] = secretPathPrefixes): string {
  if (!value) return "unknown";
  let out = value;
  try {
    const url = new URL(value);
    out = `${url.origin}${url.pathname}`;
  } catch {
    // a keyword like "inline", not a URL
  }
  for (const prefix of prefixes) {
    out = out.replace(new RegExp(`${escapeRegex(prefix)}[^/]+`), `${prefix}[secret]`);
  }
  return out.slice(0, MAX_FIELD_LENGTH);
}

export function parseCspReport(body: unknown, prefixes: readonly string[] = secretPathPrefixes): CspViolation[] {
  const legacy = legacySchema.safeParse(body);
  if (legacy.success) {
    const r = legacy.data["csp-report"];
    return [
      {
        directive: (r["effective-directive"] ?? r["violated-directive"] ?? "unknown").slice(0, MAX_FIELD_LENGTH),
        blocked: redactUrl(r["blocked-uri"], prefixes),
        page: redactUrl(r["document-uri"], prefixes),
      },
    ];
  }
  const modern = reportingApiSchema.safeParse(body);
  if (!modern.success) return [];
  return modern.data
    .filter((r) => r.type === "csp-violation" && r.body)
    .map((r) => ({
      directive: (r.body?.effectiveDirective ?? "unknown").slice(0, MAX_FIELD_LENGTH),
      blocked: redactUrl(r.body?.blockedURL, prefixes),
      page: redactUrl(r.body?.documentURL, prefixes),
    }));
}
