// Pure helpers for PostHog (product analytics). No posthog-js import here, so
// this is safe on the server (CSP) and unit-testable. The client init lives in
// src/instrumentation-client.ts; events go through track() in src/lib/track.ts.

import type { CspDirectives } from "@/lib/csp";
import { secretPathPrefixes } from "@/config/routes";

// Campaign params are the only query string worth keeping; everything else
// (?as=<id>, ?today=...) is dropped, since it can identify a person or a link.
const KEPT_PARAM = /^utm_/;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactPath(path: string, prefixes: readonly string[]) {
  let out = path;
  for (const prefix of prefixes) {
    out = out.replace(new RegExp(`${escapeRegex(prefix)}[^/?#\\s]+`, "g"), `${prefix}[secret]`);
  }
  return out;
}

function keptQuery(params: URLSearchParams) {
  const kept = new URLSearchParams();
  for (const [k, v] of params) if (KEPT_PARAM.test(k)) kept.append(k, v);
  const s = kept.toString();
  return s ? `?${s}` : "";
}

/**
 * Makes a URL or path safe to send to PostHog: secret-link segments become
 * `[secret]`, fragments go, and only utm_* query params survive. Other strings
 * still get secret segments redacted wherever they appear.
 */
export function redactSecrets(value: string, prefixes: readonly string[] = secretPathPrefixes): string {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return `${url.origin}${redactPath(url.pathname, prefixes)}${keptQuery(url.searchParams)}`;
    } catch {
      // fall through to plain redaction
    }
  }
  if (value.startsWith("/")) {
    const url = new URL(value, "http://x");
    return `${redactPath(url.pathname, prefixes)}${keptQuery(url.searchParams)}`;
  }
  return redactPath(value, prefixes);
}

type Props = Record<string, unknown>;

function redactProps(props: Props | undefined, prefixes: readonly string[]): Props | undefined {
  if (!props) return props;
  const out: Props = {};
  for (const [key, value] of Object.entries(props)) {
    out[key] = typeof value === "string" ? redactSecrets(value, prefixes) : value;
  }
  return out;
}

/**
 * Runs on every event before it leaves the browser (PostHog `before_send`).
 * Covers $current_url, $pathname, $referrer, $initial_*, $session_entry_* and
 * any other string property or person property that carries a secret link.
 */
export function redactEvent<T extends { properties: Props; $set?: Props; $set_once?: Props }>(
  event: T | null,
  prefixes: readonly string[] = secretPathPrefixes,
): T | null {
  if (!event) return event;
  return {
    ...event,
    properties: redactProps(event.properties, prefixes) ?? {},
    $set: redactProps(event.$set, prefixes),
    $set_once: redactProps(event.$set_once, prefixes),
  };
}

/**
 * CSP entries PostHog needs, from NEXT_PUBLIC_POSTHOG_HOST. Empty when PostHog
 * isn't configured. Cloud hosts serve their lazy-loaded scripts from a sibling
 * `-assets` host (us.i.posthog.com -> us-assets.i.posthog.com).
 */
export function posthogCsp(host: string | undefined): CspDirectives {
  if (!host) return {};
  let url: URL;
  try {
    url = new URL(host);
  } catch {
    return {};
  }
  const assets = `${url.protocol}//${url.hostname.replace(/^([a-z0-9-]+)\.i\.posthog\.com$/, "$1-assets.i.posthog.com")}`;
  return {
    // Events go to the ingest host; remote config is fetched from the assets host.
    "connect-src": [...new Set([url.origin, assets])],
    "script-src": [assets],
  };
}
