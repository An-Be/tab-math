import { parseCspReport } from "@/lib/csp-report";

// Receives CSP violation reports (see src/lib/csp.ts) and logs one line per
// violation; filter Vercel runtime logs on "[csp]". Public by necessity, so it
// stores nothing, caps body size and lines per request, and redacts secret
// link segments from every URL.
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
