# Module: product analytics (PostHog)

**Built in, off until configured.** With no env vars the app runs exactly as
before and `track()` does nothing.

## Turn it on

1. In PostHog, create a **new project for this tool** (one project per tool keeps
   dashboards and warehouse tables apart). Pay-as-you-go plan, with a billing
   limit set on every product.
2. Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`
   (`https://us.i.posthog.com`) in Vercel for Production. They're public by
   design: a project token can only send events. Not Sensitive.
3. Redeploy. The CSP picks up the host automatically (`posthogCsp()` in
   `src/config/csp.ts`).

## What's in the template

| File | Does |
|---|---|
| `src/instrumentation-client.ts` | `posthog.init` when both env vars are set |
| `src/lib/analytics.ts` | `redactEvent` (the `before_send`), `redactSecrets`, `posthogCsp`; tested |
| `src/lib/track.ts` | `track(event, props)`: the only way feature code sends events |
| `src/app/global-error.tsx` | reports root-layout crashes with `captureException` |

## Privacy defaults (don't loosen without a reason)

- **Secret links never leave the browser.** `before_send` replaces the segment
  after every `secretPathPrefixes` entry with `[secret]` in every string property
  (`$current_url`, `$pathname`, `$referrer`, `$initial_*`, person properties) and
  drops query strings except `utm_*`. Add new secret prefixes to
  `src/config/routes.ts`, never here.
- **Autocapture without content.** `mask_all_text` and
  `mask_all_element_attributes` keep clicks and pageviews but drop element text
  (people's names) and attributes (secret-link hrefs).
- **Session replay is off** (`disable_session_recording`). Replays show names and
  totals. If a tool needs it, enable it in code and set
  `session_recording: { maskTextSelector: "*" }`, plus `"worker-src": ["blob:"]`
  in the CSP.
- **Event properties are flat primitives**: counts, modes, outcomes. Never names,
  free text, tokens, or an amount tied to a person.

## Naming events

`object_action`, snake case, past tense: `tracker_created`, `night_recorded`,
`link_copied`. Put the variant in a property (`{ status: "done" }`), not in the
event name.

## Optional extras (TabMath has them)

- **Identify signed-in organizers** (Clerk module): `posthog.identify(user.id)`
  on sign-in, `posthog.reset()` on sign-out. Guests and secret-link visitors
  stay anonymous.
- **Server-side events / LLM analytics**: `posthog-node` in `src/lib/server/`,
  `flushAt: 1, flushInterval: 0` on serverless, `await posthog.flush()` before
  returning. For `@posthog/ai` wrappers set `privacyMode: true` unless you mean
  to send prompts and outputs (receipt photos, extracted items) to PostHog.
- **Database in the PostHog warehouse**: connect Neon as a Postgres source with a
  read-only `posthog_reader` role granted only the tables you want, no SSH
  tunnel, the PostHog warehouse as destination, and a per-tool table prefix
  (`tabmath_`). Tables holding secret tokens or names sync in full, so leave
  them out or expose an `analytics` schema of views instead.
