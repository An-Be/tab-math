// Client-side fetch helper for this app's own JSON API. Always sends
// application/json (required by rejectCrossSite) and never throws: callers
// branch on `ok`. On an HTTP error, `body` holds the parsed response so a
// route can return extra context (e.g. the conflicting record on a 409).
// `status` is 0 when the request never reached the server (offline).
export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; body: unknown };

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export async function api<T>(path: string, init: { method: Method; body?: unknown }): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method,
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, error: "You look offline. Try again.", body: null };
  }
  const payload: unknown = await res.json().catch(() => null);
  if (res.ok) return { ok: true, status: res.status, data: payload as T };
  const error =
    payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "Something went wrong.";
  return { ok: false, status: res.status, error, body: payload };
}
