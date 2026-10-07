import { parseCspReport } from "@/lib/csp-report";

// Receives CSP violation reports from browsers (see lib/csp.ts) and writes
// one log line per violation, readable in Vercel's runtime logs by
// filtering on "[csp]". Public and unauthenticated by necessity, so it
// stores nothing, caps the body size, caps lines per request, and redacts
// share tokens and split ids out of every URL before logging.
const MAX_BODY_BYTES = 64 * 1024;
const MAX_VIOLATIONS_PER_REQUEST = 20;

export async function POST(request: Request) {
  const text = await request.text().catch(() => "");
  if (!text || text.length > MAX_BODY_BYTES) return new Response(null, { status: 204 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 204 });
  }

  for (const v of parseCspReport(body).slice(0, MAX_VIOLATIONS_PER_REQUEST)) {
    console.warn(`[csp] ${v.directive} blocked=${v.blocked} page=${v.page}`);
  }
  return new Response(null, { status: 204 });
}
