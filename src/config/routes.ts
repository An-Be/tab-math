/**
 * Path prefixes whose next segment is a secret or an identifier we keep out of
 * logs (src/lib/csp-report.ts). Keep in sync with privateHeaders in next.config.ts.
 */
export const secretPathPrefixes = ["/p/", "/split/", "/api/splits/"] as const;
