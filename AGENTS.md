<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

> **Everything below is project-owned and must stay OUTSIDE the markers above.**
> `next dev` replaces the entire contents between `BEGIN:nextjs-agent-rules` and
> `END:nextjs-agent-rules` with its own text whenever they do not match. Rules
> written inside that block are destroyed on the next `next dev`. Text before
> and after it is kept.

# Project Context & Code Quality Rules

## Tech Stack

TabMath — photograph a restaurant receipt, split it by item or evenly, share
one link; whoever opens it picks their own name and sees only their total,
no login. The organizer can use it without an account too (see Guest
sessions, below).

### Core

- **Next.js 16.3.8** — App Router, React Server Components by default, Turbopack
- **React 19.2.8**, **TypeScript 5** (strict)
- **Tailwind CSS 4** — CSS-first config; there is no `tailwind.config.ts`,
  theme tokens live in `app/globals.css` under `@theme inline`
- **shadcn/ui**, `base-nova` style, built on **Base UI** (`@base-ui/react`
  1.8). Config in `components.json`. Primitives are generated into
  `components/ui/` and may be overwritten by `npx shadcn add`.
- `cn` (the `cn` package, re-exported from `lib/utils.ts`) for class merging
- `lucide-react` icons, `sonner` toasts

### Data

- **Postgres (Neon)** + **Prisma 7.10** with `@prisma/adapter-pg` + `pg`
- Generator is **`prisma-client`** (not `prisma-client-js`): it emits
  **TypeScript** into `lib/generated/prisma`, which is **gitignored** — run
  `npx prisma generate` after cloning, before `dev` or `build` will work.
  `package.json`'s `build` and `postinstall` scripts both do this already;
  don't remove that.
- Datasource URL lives in **`prisma.config.ts`** (read via `dotenv/config`
  from `.env`), not in `schema.prisma`'s `datasource` block — Prisma 7
  removed `url` from schema files.
- A **driver adapter is mandatory** in Prisma 7 — see `lib/prisma.ts`. Pool is
  capped at `max: 5`: this runs in many concurrent Vercel function instances,
  each with its own pool, and the `pg.Pool` default of 10 would multiply
  across instances fast enough to blow through Neon's connection limit under
  real concurrent traffic.
- **If you ever spin up a local `npx prisma dev` server**: `migrate dev`
  against it does not work, full stop — not a flag or shadow-database-URL
  problem. That server auto-syncs every database it manages to the project's
  current migration history the instant the database is created, including
  the shadow database `migrate dev` creates for itself to diff against.
  `migrate dev` needs an empty database to replay history into and never gets
  one there, so it fails with something like `type "X" already exists` on
  the *first* historical migration — confusing, because the error names an
  old migration, not the new one you're adding. To add a migration against a
  server like that:
  ```bash
  npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script \
    > prisma/migrations/$(date -u +%Y%m%d%H%M%S)_<name>/migration.sql
  npx prisma migrate deploy   # applies it directly — no shadow DB involved
  ```
  This project now runs directly against real Neon for both dev and prod, so
  this shouldn't come up — but it's exactly the bug that cost real debugging
  time once already (see Validating Decisions).
- A hand-authored migration folder's directory name **is** its sort order.
  Prisma applies migrations by filename timestamp, not creation order or git
  history — a folder timestamped earlier than one it logically follows will
  be applied first against a fresh database, even if your local database
  (which just has both marked "already applied") never caught it. This
  already happened once in this repo's history; see Validating Decisions.

### Services

- **Clerk 7.9** (`@clerk/nextjs`) — organizer accounts; payers never see Clerk
- **Guest sessions** (`lib/get-current-actor.ts`, `proxy.ts`) — an organizer
  can use the whole app with zero sign-up. `proxy.ts` issues a `guest_id`
  cookie (httpOnly, `sameSite: lax`, `secure` in production,
  `crypto.randomUUID()`) and a mirrored `User` row (`isGuest: true`). The
  moment a guest later signs in for real, `proxy.ts` detects both identities
  on the same request and merges the guest's splits onto the real account in
  one transaction, then drops the cookie. `getCurrentActor()` is the single
  place that resolves "who is making this request" — Clerk first, guest
  cookie second — and every route/page should call it rather than reading
  `auth()` or the cookie directly.
- **Uploadthing 7.7** — receipt photos
- **Google Gemini** (`@google/genai`) — receipt line-item + tax/tip
  extraction, `lib/ai-extract.ts`. Structured output via `responseJsonSchema`,
  not free-text parsing. Model name has moved once already
  (`gemini-2.5-flash` → `gemini-3.8-flash` after Google deprecated the
  former) — if extraction starts 404ing, that's almost certainly a model
  rename again; check the error message, it names the replacement.
- **Zod 4** — all external input validation. Object schemas strip unknown
  keys by default, which is why mass-assignment isn't a concern on the PATCH
  routes — don't switch any of them to `.passthrough()`.

### Version-specific rules that override older training data

- `middleware.ts` is **`proxy.ts`** in Next 16. Node-only runtime, not
  configurable (good — ours talks to Postgres directly, which an Edge
  runtime couldn't do). Export a function named `proxy` or default-export it.
- `params`, `searchParams`, `cookies()`, and `headers()` are all **async** —
  `await` them.
- Clerk **deprecates `createRouteMatcher`**. `proxy.ts` uses a plain
  `pathname.startsWith(...)` check instead — that's routing logic (which
  requests need an actor resolved), not an authorization decision, so the
  deprecated helper was never actually needed for it.
- Import Prisma types/client from `@/lib/generated/prisma/client`, **never**
  from `@prisma/client`.
- **shadcn `base-nova` has no `asChild`.** Base UI uses a `render` prop
  instead: `<Button render={<Link href="/x" />}>Label</Button>`, label as
  children rather than inside the rendered element.
- When a `render` prop supplies a **non-`<button>`** element (a `next/link`
  anchor, an external `<a>`), you must also pass **`nativeButton={false}`**.
  Base UI defaults it to `true` and otherwise throws a hydration error and
  drops the `role="button"`/`tabindex` it would add. Hit this for real in
  `app/page.tsx`'s landing CTA — see Validating Decisions.
- Native `<button>` elements default to `cursor: default` in Chrome, not
  `pointer` — Tailwind's preflight doesn't patch this. Fixed globally in
  `app/globals.css`'s `@layer base` rather than per-component.

## Essential Commands

- Dev server: `npm run dev` (port 3200)
- Build & verification: `npm run build` (runs `prisma generate` first)
- Code quality: `npm run lint` && `npx tsc --noEmit`
- Migrations: `npx prisma migrate dev --name <name>` (against real Neon —
  shadow DB works normally there); `npx prisma studio` to browse data
- Local Postgres, if you want one: `npx prisma dev --detach --name <name>` —
  read the migration caveat above first

## Architecture & Code Cleanliness

### 1. Component Boundaries

- **Server Components by default.** Only add `"use client"` when a component
  needs state, event handlers, or a browser API. Every file under
  `app/split/[id]/page.tsx`, `app/splits/page.tsx`, and `app/p/[shareToken]/page.tsx`
  is a Server Component that fetches with Prisma directly and passes already-shaped
  data down to a client component — never a client-side fetch for initial load.
- **Folder structure:** routes in `app/`; shadcn primitives in
  `components/ui/` (regenerable, don't hand-edit beyond what shadcn itself
  wrote); feature components in `components/splits/` and `components/payer/`;
  pure logic with no JSX in `lib/`.
- `lib/totals.ts` is the single source of truth for bill math — itemized
  proration and even-split division. It's pure (no Prisma, no HTTP) on
  purpose: the API route and any future surface (payer view, a future
  export feature) call the same function rather than recomputing. **The
  payer view never computes its own totals — it only reads** what this
  function produced server-side. Don't let that invariant drift.

### 2. Strict Cleanliness Rules

- **No default exports**, except required Next.js files (`page.tsx`,
  `layout.tsx`, `manifest.ts`) and config files their own tooling requires
  (`next.config.ts`, `prisma.config.ts`).
- **No inline styles.** Tailwind utility classes only.
- **Early returns** over nested conditionals — see `getCurrentActor`,
  `requireSplitOwner`, every route handler's guard-clause-first shape.
- **One component per file.**
- **State stays local.** `SplitWorkspace` owns all of a single split's
  editing state and passes handlers down; nothing is lifted into a global
  store, and there isn't one.

### 3. TypeScript & Type Safety

- **No `any`.** Use `unknown` and narrow, or a precise generic.
- **Zod validates every external input** — every route handler parses
  `request.json()` through a schema before touching Prisma.
- Use `next/image` and `next/link` for anything internal. External payment
  links (Venmo/Cash App/Stripe) and the organizer's pasted Stripe link are
  plain `<a>` — see Documented Exceptions.

### 4. Authorization

- Protection is **per-resource, never path-based**. Every route under
  `/api/splits/[id]/*` calls `requireSplitOwner(id)` first — resolves the
  actor via `getCurrentActor()`, then checks `split.userId === actor.id`.
  Routes referencing a *sub*-resource (an item, a person, an assignment)
  additionally verify that sub-resource belongs to the split in the URL, not
  just that the split belongs to the caller — see `assignments/route.ts` and
  `items/[itemId]/route.ts` for the pattern. Copy one of these files as the
  template for any new mutating route; don't write the check from scratch.
- Return **404, not 403**, when a resource doesn't belong to the caller, so
  an id can't be used to probe for existence.
- **`/`, `/p/[shareToken]`, and `/api/uploadthing` must keep working with no
  Clerk session at all** — they're the public/guest/payer surfaces. Never
  move an auth requirement into `proxy.ts`'s matcher for these; it runs on
  every request and would take the payer link down for everyone who has it.
- The payer view (`app/p/[shareToken]/page.tsx`) is intentionally
  minimal: it renders the split title, the list of first names (for the
  "who are you" picker), and — only once a person is selected — that one
  person's total and sanitized payment options. It never receives the
  organizer's email, user id, other people's amounts, or the raw item list
  as props to a client component. If you touch this file, re-verify that
  invariant by reading what gets passed across the server/client boundary,
  not just that it renders correctly.

### 5. Hardening (`lib/rate-limit.ts`, `lib/client-ip.ts`)

- **Rate limiting is Postgres-backed** (`RateLimitHit`; no Redis/Upstash is
  provisioned — deliberate, see Documented Exceptions). `checkRateLimit(key,
  { limit, windowSeconds })` does a single atomic upsert-and-increment, fixed
  window; verified race-free under real concurrent load (10 simultaneous
  calls against a limit of 5 → exactly 5 allowed). Keyed by IP
  (`getClientIp()`, reads `x-forwarded-for`), not by actor id — a guest can
  get a fresh actor id for free by clearing cookies, so actor-id keying alone
  wouldn't stop anything. Applied to the three routes with a real cost: photo
  extraction (Gemini calls, 10/10min), split creation (DB bloat, 20/hour),
  and uploads (storage, 15/10min) — all keyed by IP.
- **No CSRF-specific guard exists.** The guest cookie's `sameSite: "lax"` is
  the only CSRF mitigation in place (it blocks cookies from being sent on a
  cross-site POST), plus whatever Clerk's own session handling does
  internally for its cookie. There's no explicit same-origin/`Origin`-header
  check on mutating routes. Fine for the current stakes (no money moves
  through this app), but if that ever changes, add one before anything else.
- **No audit log exists.** Not needed yet — there's no multi-operator access
  to a single split, and nothing here is compliance-sensitive. Worth adding
  if that stops being true.

## Validating Decisions

**When you introduce a conditional, a fallback, a retry, or anything
dependent on external state, validate every branch. Do not guess, and do not
reason that an untested case is probably fine.**

A green `build`, `tsc --noEmit`, and `lint` are **not** validation — they
don't catch a state update an uncontrolled input silently fails to reflect,
a migration that only looks applied because the database it ran against
skipped replaying history, or a retry loop that only handles one of the two
ways a call can fail.

Required steps for any such change:

1. **Enumerate every consumer** of the thing you made conditional —
   `grep` for it, don't work from memory of what you wrote.
2. **Exercise every branch at runtime**, not just the happy one. For this
   project that has usually meant: a real script against the real database
   (not an assumption about Prisma's behavior), or a live `curl` sequence
   against the running dev server.
3. **Check the blast radius** — which unrelated surfaces can the branch you
   just touched take down with it, and did you confirm they still work.
4. **State what you couldn't exercise.** If something's unreachable without
   a credential you don't have, say so rather than implying it passed.

Precedents in this repo, each of which shipped looking correct and was only
caught by actually exercising it:

- **Uncontrolled tax/tip inputs didn't resync on an external update.** The
  tax and tip fields save on blur (uncontrolled, `defaultValue` + `onBlur`).
  When Gemini extraction fills in a tax value *after* the field had already
  mounted at `$0.00`, the field kept showing `$0.00` — the real value was
  saved correctly underneath, but the input never re-rendered to reflect it,
  because `defaultValue` only applies once at mount. Compiled fine, looked
  fine on first load; only visible by actually uploading a receipt with a
  tax line after the form had already rendered. Fixed with a `key={taxCents}`
  remount trick, not by switching to a controlled input (that would mean
  the field fighting the user's keystrokes against every byte of
  server round-trip).
- **A migration folder's own name silently broke a fresh database.** A
  hand-authored migration (to work around the `prisma dev` shadow-db issue
  above) got a timestamp earlier than the migration before it. The local
  dev database never caught it, because both had just been marked "already
  applied" without ever being replayed in order. It only surfaced the first
  time `migrate deploy` ran against a genuinely empty database (real Neon)
  and tried to apply them in filename order.
- **`Button render={<Link />}` without `nativeButton={false}`** threw a
  hydration error in the browser console on the landing page's primary CTA.
  Types compiled — `render` accepts any element — so it looked done.
- **A connection-pooling bug only appeared under concurrent load.** Local
  `prisma dev` multiplexes connections in a way that corrupts Postgres's
  unnamed prepared-statement protocol under concurrent queries
  (`bind message supplies N parameters, but prepared statement "" requires
  0`) — a known class of bug with transaction-mode connection poolers, not
  something `tsc`/`lint`/a single manual request would ever catch. Moved to
  real Neon directly; re-ran the exact failing concurrent-query pattern 15x
  to confirm before considering it closed.

## Documented Exceptions

These are deliberate. Don't "fix" them without discussion.

- **Plain `<a>` instead of `next/link`** for: external payment provider
  links (Venmo/Cash App/the organizer's Stripe link) — these leave the app
  entirely, `next/link` is for internal navigation only.
- **Inline `<svg>` instead of `next/image`** for the brand mark in the
  header (`app/layout.tsx`). It uses `fill="currentColor"` so it inherits
  text color in both the header and anywhere else it's reused — `next/image`
  can't do that, and this isn't a photo Next needs to optimize/resize.
- **No Redis/Upstash for rate limiting.** Deliberately Postgres-backed
  instead, reusing infrastructure already provisioned rather than adding a
  service purely for this. Revisit only if volume grows enough that the
  extra writes to `RateLimitHit` become a measurable load on the primary DB
  — not a concern at this app's current scale.
- **IP-based rate limiting, not a CAPTCHA or stronger identity check.**
  Appropriate for "stop a buggy retry loop or casual abuse" at this app's
  current scale (shared with people you know), not "defend against a
  determined attacker with rotating proxies." Don't read the existence of
  rate limiting as a claim that it's bulletproof.

## What NOT to Touch

- `lib/generated/prisma/**` is generated by `prisma generate`. Never
  hand-edit it — it's gitignored and gets wiped on every `npm install`.
- `components/ui/**` primitives created by `npx shadcn add` may be
  regenerated; don't build project-specific logic into them.
- `tab-math-icon/` is the source icon kit (SVG masters, the full PNG size
  range, and its own README with a spec/don't-touch list for the mark
  itself). It's a reference bundle, not wired into the build — the actual
  installed icons are `app/favicon.ico`, `app/apple-icon.png`,
  `app/manifest.ts`, and `public/icon-*.png`.

## Active Focus

M1–M3 of the original spec are complete (split CRUD + receipt extraction;
assignment + totals + tax/tip + even-split; share links + payer view +
payments + dashboard), plus a security/hardening pass (per-resource auth
audit, Postgres-backed rate limiting, connection pool sizing) and an
aesthetic system (monochrome, geometric, typographic — see `app/globals.css`
and the numbered-section convention in `SplitWorkspace`).

**Testing:** Vitest (`npm test` / `npm run test:watch`). Currently covers the
two pure `lib/` modules with no DB dependency — `lib/totals.ts` (every
proration/remainder-penny edge case, both split modes, the spec's own
acceptance-criteria example) and `lib/payment-links.ts` (handle parsing for
every provider). Anything pure belongs in a `*.test.ts` next to the module it
tests. `lib/rate-limit.ts` is deliberately not unit-tested — it's a thin
wrapper around one Postgres upsert, and the thing worth verifying (no race
under real concurrency) was already exercised with a one-off script against
live Neon rather than a mock; a real integration test for it would need a
test database wired into CI, which doesn't exist yet. Route handlers and
Server Components aren't tested at all yet — if that's ever worth doing,
reach for Next's own testing guide rather than guessing at a setup.

## Validating a Feature Before Building It

`FeatureInterest` + `/api/feature-interest` + `components/landing/feature-interest.tsx`
is the pattern for a proposed feature that shouldn't be built until there's
evidence anyone wants it: a small teaser on the landing page with an "I'd use
this" button, gated by the same allowlist-enum approach as everything else
public-facing (`FEATURES` in the route — add a new key there before a
component can record interest in it, never accept an arbitrary string).
Check demand with `npx prisma studio` or a quick count query, not a built
dashboard — this isn't worth more infrastructure than the signal it's
measuring. The current entry (`self-claim-items`) is the v2 idea of letting
payers tap their own items instead of the organizer assigning everything;
deliberately not built — see the conversation that proposed it for the real
tradeoffs (identity, double-claims, unclaimed items, trust) before picking
this back up.

## Before Deploying

Checked as of the last pre-deployment review — re-verify rather than trust
this blindly if time has passed:

- **Nothing has been pushed anywhere.** `git log` has exactly one commit,
  the original `create-next-app` scaffold — everything built since is
  uncommitted, and no remote is configured. Commit and push before anything
  else; a Vercel deploy needs a repo to deploy from.
- **No Vercel project exists yet** for this app (checked the account
  directly). The sequence is: push the repo → create the Vercel project from
  it → set the four env vars in Vercel's dashboard (never commit them) → add
  any custom domain inside that project's Settings → Domains, which will
  tell you definitively what DNS record it wants rather than guessing ahead
  of time.
- **Clerk is a development instance** (`pk_test_...`, on a
  `.clerk.accounts.dev` domain) — it'll run in production fine, but Clerk's
  own SDK logs a warning that dev instances have stricter usage limits and
  aren't meant for real production traffic. Promoting to a production
  instance means adding a custom domain in Clerk's dashboard. Fine to defer
  for a soft launch; shouldn't be deferred indefinitely.
- **Local dev and "production" share one Neon branch** (just `production` —
  no `dev` branch exists). Every local test run hits the same database a
  real deployment would use. Worth creating a separate branch
  (`neon branches create`) and pointing local `.env` at it before this sees
  real traffic, so local testing stops mixing with real data.
- Run a real production build locally (`npm run build && npm start`) before
  the first deploy — catches anything that only breaks outside `next dev`.
