// Pure CSP builder (no Next imports) so it can be unit-tested and reused by
// src/proxy.ts. Per-tool origins live in src/config/csp.ts.

export type CspDirectives = Record<string, string[]>;

export const CSP_REPORT_PATH = "/api/csp-report";

export function baseDirectives(nonce: string, isDev: boolean): CspDirectives {
  return {
    "default-src": ["'self'"],
    // 'strict-dynamic' + nonce: only scripts Next rendered (and what they load) run.
    // React needs eval in dev for error overlays only.
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    // The dev overlay injects un-nonced styles; production stays nonce-only.
    "style-src": ["'self'", isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "report-uri": [CSP_REPORT_PATH],
    "upgrade-insecure-requests": [],
  };
}

/** Merges extra sources into the base set. Never removes a base source. */
export function mergeDirectives(base: CspDirectives, extra: CspDirectives): CspDirectives {
  const out: CspDirectives = { ...base };
  for (const [key, values] of Object.entries(extra)) {
    const existing = out[key] ?? [];
    out[key] = [...existing, ...values.filter((v) => !existing.includes(v))];
  }
  return out;
}

export function serializeCsp(directives: CspDirectives): string {
  return Object.entries(directives)
    .map(([key, values]) => (values.length ? `${key} ${values.join(" ")}` : key))
    .join("; ");
}

export function buildCsp(nonce: string, isDev: boolean, extra: CspDirectives = {}): string {
  return serializeCsp(mergeDirectives(baseDirectives(nonce, isDev), extra));
}

export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
