<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

> **Everything below is project-owned and must stay OUTSIDE the markers above.**
> `next dev` replaces everything between `BEGIN:nextjs-agent-rules` and
> `END:nextjs-agent-rules` whenever it doesn't match. Text before and after is kept.

# Project rules

This repo follows **tool-template** (github.com/An-Be/tool-template), the shared
base for Andrea's tiny tools. Tool-specific context goes in the "This tool"
section at the bottom; everything above it is shared and should stay in sync
with the template.

## Never commit or push without asking

Do not run `git commit` or `git push` on your own initiative, even for a small,
verified fix. Make the change, verify it, say what you'd commit, and ask. Every
time. A push to `main` deploys to production on Vercel.

## Stack

- **Next.js 16** (App Router, Turbopack, RSC by default), **React 19**, **TypeScript 5** strict
- **Tailwind CSS 4**, CSS-first: tokens live in `src/app/globals.css` under `@theme`. No `tailwind.config`.
- **Hand-rolled UI primitives** in `src/components/ui/` (no shadcn, no Base UI). `cn()` from `src/lib/utils.ts`, variants with `cva`.
- **Postgres on Neon** + **Prisma 7** with `@prisma/adapter-pg`
- **Zod 4** for every external input
- **Vitest** for pure logic
- **Vercel**, region `cle1` (next to Neon `aws-us-east-2`)

### Version rules that override older training data

- `middleware.ts` is **`src/proxy.ts`** in Next 16. Node runtime only.
- `params`, `searchParams`, `cookies()` and `headers()` are **async**. `await` them.
- Page props are typed with the generated global `PageProps<"/route/[param]">`
  (run `next typegen`, which `npm run typecheck` does).
- Prisma 7: generator is `prisma-client` (not `prisma-client-js`), output
  `src/lib/generated/prisma` (gitignored). Import from
  `@/lib/generated/prisma/client`, **never** `@prisma/client`. The datasource URL
  is in `prisma.config.ts`, not `schema.prisma`. A driver adapter is mandatory
  (`src/lib/server/db.ts`).

## Layout

```
src/app/                 routes; Server Components fetch, client components render
src/app/api/             route handlers
src/components/ui/       hand-rolled primitives (Button, Input, Field, Dialog, Switch, Toast, CopyField, SectionLabel, Shell)
src/components/site/     header, footer, mark
src/components/<feature>/ feature components
src/config/              site.ts (name, copy), csp.ts (CSP allowlist), routes.ts (secret path prefixes)
src/lib/                 pure logic, no JSX; safe on client and server
src/lib/server/          server-only modules (each imports "server-only")
src/proxy.ts             per-request nonce CSP
prisma/                  schema, migrations, sql/app-role.sql
scripts/db-check.mjs     build-time schema drift check
```

## Security (non-negotiable)

- **No secrets on the client.** Never prefix a secret with `NEXT_PUBLIC_`. Every
  module that touches the database or a secret lives in `src/lib/server/` and
  imports `server-only`, so importing it from a client component fails the build.
- **Secret links are credentials.** Generate them with `newToken()` (128-bit,
  base62). Never use `cuid()`/`uuid()` for anything that grants access.
  Format-check with `isWellFormedToken()` before querying.
- **Every mutating route starts with `rejectCrossSite(req)`** (CSRF: Sec-Fetch-Site,
  Origin, JSON content type), then `checkRateLimit()` if the route costs anything
  (writes, AI calls, uploads), then `parseJsonBody(req, schema)`. Start new routes by copying an existing
  mutating route (in the template: `src/app/api/spaces/route.ts`).
- **Zod object schemas strip unknown keys**; that is what blocks mass assignment.
  Never use `.passthrough()` / `.loose()`.
- **Return 404, not 403**, for a resource that doesn't exist or isn't the caller's,
  so ids and tokens can't be probed.
- **Select only the fields a view needs** and pass only those across the
  server/client boundary. Never hand a whole row to a client component.
- **Secret-link pages**: add the prefix to `privateHeaders` in `next.config.ts`
  (`no-store`, `noindex`) and to `secretPathPrefixes` in `src/config/routes.ts`
  (log redaction). Page titles never include user content.
- **CSP** is built per request in `src/proxy.ts` with a nonce and must stay the only
  CSP header. Add third-party origins in `src/config/csp.ts`, one comment per entry.
  Violations are logged by `/api/csp-report` (filter Vercel logs on `[csp]`).
- **No inline `style` attributes.** Production CSP is nonce-only for styles.

## Database

- The app connects as a **least-privilege role** (`prisma/sql/app-role.sql`):
  row access on app tables only, no DDL.
- **Migrations are applied by the Neon owner role**, not the app role. After a
  migration adds a table, extend the app role's grants.
- `npm run build` runs `scripts/db-check.mjs`, which fails the build if the live
  database doesn't match `schema.prisma` (required on Vercel, skipped locally
  without `DIRECT_URL`).
- A migration folder's name is its sort order. Generate new ones with
  `npx prisma migrate dev --name <name>` or, by hand,
  `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`
  into a folder timestamped **after** the latest one.
- Concurrency: when two writers can race (two phones tapping at once), lock the
  parent row (`SELECT ... FOR UPDATE` in a transaction) or lean on a unique index.

## Code rules

- Server Components by default. `"use client"` only for state, handlers or browser APIs.
  Initial data is fetched on the server and passed down, never fetched client-side on load.
- **No default exports** except files Next or a tool requires (`page`, `layout`,
  `not-found`, `manifest`, `route` handlers are named exports, configs).
- **One component per file.** Early returns over nesting. **No `any`.**
- Client calls to our own API go through `api()` in `src/lib/api-client.ts`.
- Pure logic belongs in `src/lib/*.ts` with a `*.test.ts` next to it.
- `next/link` for internal links; plain `<a>` only for links that leave the app.
- Colors come from tokens (`ink`, `paper`, `mute`, `faint`, `wash`). Type is
  `display` (Space Grotesk) or mono; small caps text uses the `label` utility.
  Sections are numbered with `SectionLabel`.
- Inputs use 16px text on mobile so iOS doesn't zoom.

## Validating changes

A green `build`, `typecheck` and `lint` are not validation. When you add a
conditional, fallback, retry or anything that depends on external state:

1. Find every consumer with `grep`, not memory.
2. Exercise every branch at runtime (a `curl` sequence against `npm run dev`, or
   a script against a real database).
3. Check the blast radius: which other surfaces could this break?
4. Say what you couldn't exercise.

## Commands

```bash
npm run dev         # dev server
npm run build       # prisma generate + drift check + next build
npm run typecheck   # next typegen + tsc
npm run lint
npm test            # vitest
npx prisma studio
```

## This tool

**TabMath**: photograph a restaurant receipt, split it by item or evenly, share
one link. Whoever opens it picks their own name and sees only their total, no
login. The organizer can use it without an account too (guest sessions). No
money moves through the app; "Pay" hands off to the organizer's Venmo, Cash
App, Zelle or Stripe link.

Dev server runs on port 3200 (`npm run dev`).

### Optional modules in use

- **Clerk 7.9** (`@clerk/nextjs`): organizer accounts; payers never see Clerk.
  `src/proxy.ts` is `clerkMiddleware`, and the CSP is built by Clerk from
  `src/lib/clerk-csp.ts` (shared defaults + `src/config/csp.ts`), currently
  **report-only**. Flip `reportOnly` once `[csp]` reports go quiet across
  sign-in, receipt upload and the payer view.
  - Themed with `@clerk/ui`'s `shadcn` theme, fed by the variable bridge in
    `src/app/clerk-theme.css`. Not optional polish: Clerk's unthemed modal
    let page content bleed through its footer strip.
  - Google OAuth is enabled on both Clerk instances alongside email-code.
  - Production Clerk loads from `clerk.tabmath.com` (needs 5 CNAMEs at the
    registrar). A `/__clerk/npm/...` 404 means DNS, not the proxy matcher.
    The `/__clerk/(.*)` matcher entry is a harmless leftover.
  - Clerk deprecates `createRouteMatcher`; the proxy uses a plain prefix check
    because it's routing (which requests need an actor), not authorization.
- **Guest sessions** (`src/lib/server/get-current-actor.ts`, `src/proxy.ts`):
  the proxy issues a `guest_id` cookie (httpOnly, `sameSite: lax`, `secure` in
  production) and a mirrored `User` row (`isGuest: true`). When a guest signs
  in, the proxy merges their splits onto the real account in one transaction
  and drops the cookie. `getCurrentActor()` is the only place that resolves
  who is asking; never read `auth()` or the cookie directly.
- **Uploadthing 7.7**: receipt photos (`src/app/api/uploadthing/core.ts`).
- **Google Gemini** (`src/lib/server/ai-extract.ts`): line items + tax/tip via
  `responseJsonSchema`. `MODELS` is an ordered list (primary, then a sibling
  fallback after retries). Model names have changed before; a 404 names the
  replacement. Verify a new model supports image input + `responseJsonSchema`.

### Domain rules

- `src/lib/totals.ts` is the single source of truth for bill math. Pure. The
  payer view never computes totals itself; it reads what this produced.
- **Per-resource authorization, never path-based.** Every `/api/splits/[id]/*`
  route calls `requireSplitOwner(id)` first; routes on a sub-resource (item,
  person, assignment) also check it belongs to the split in the URL. Copy
  `assignments/route.ts` or `items/[itemId]/route.ts` for new routes.
- `/`, `/p/[shareToken]` and `/api/uploadthing` must work with no Clerk
  session. Never add an auth requirement for them to the proxy.
- **The payer view** (`src/app/p/[shareToken]/page.tsx`) only ever renders the
  title, first names, and once someone is picked, that person's total and
  sanitized payment options. Re-check what crosses the server/client boundary
  whenever you touch it.
- **Share tokens** are generated with `newToken()` in `POST /api/splits`.
  Splits created before the template alignment keep their original cuid
  tokens so links already sent keep working.
- **The extract route fetches the photo server-side**, so `imageUrl` must pass
  `isUploadthingFileUrl()` (`src/lib/receipt-url.ts`) and redirects are refused.
  Never loosen that; it's the SSRF guard.
- Request schemas live in `src/lib/split-schemas.ts`. Receipt error messages
  shown to people live in `src/lib/receipt-errors.ts`.

### Rate limits (Postgres, keyed by IP)

Receipt extraction 10/10 min (only real Gemini calls count), split creation
20/hour, uploads 15/10 min, feature-interest votes 5/hour.

### Database notes

- `DATABASE_URL` and `DIRECT_URL` are both the **direct** Neon string: local
  `prisma dev` multiplexing corrupted unnamed prepared statements under
  concurrency once; real Neon direct is verified.
- Neon branches: `production` (`br-bold-sunset-b5sclpxc`) is the deploy
  target, `dev` (`br-shiny-sun-b5b03m3t`) is local. A `--schema-only` branch
  also wipes `_prisma_migrations`; fix with `prisma migrate resolve --applied`
  per migration, not `migrate deploy`.
- Never run `migrate dev` against a local `prisma dev` server (it pre-syncs
  the shadow database). Use `migrate diff ... --script` + `migrate deploy`.

### Precedents worth remembering

Each shipped looking correct and was only caught by exercising it:

- Uncontrolled tax/tip inputs (`defaultValue` + `onBlur`) didn't show a value
  extraction filled in later. Fixed with `key={taxCents}` remounts, not a
  controlled input.
- A hand-made migration folder timestamped before its predecessor broke a
  fresh database (folder name is sort order).
- A pooling bug only appeared under concurrent load; re-ran the failing
  pattern 15x against real Neon before closing it.

### Validating a feature before building it

`FeatureInterest` + `/api/feature-interest` + `src/components/landing/feature-interest.tsx`
is the pattern for gauging demand before building: a teaser with an "I want
this" button, allowlisted keys only (`FEATURES` in the route). Current entry:
`self-claim-items` (payers tap their own items). Deliberately not built yet;
the open questions are identity, double-claims, unclaimed items and trust.

### Documented exceptions

- Plain `<a>` for payment provider links (they leave the app).
- `lucide-react` icons are used alongside the hand-rolled primitives.
- `Referrer-Policy: strict-origin-when-cross-origin` and
  `Cross-Origin-Opener-Policy: same-origin-allow-popups` (see `next.config.ts`):
  kept from the proven Clerk + Google OAuth setup. Neither leaks a path.
- Postgres rate limiting instead of Redis; IP-based, not a CAPTCHA. Fine for
  "stop a buggy retry loop or casual abuse", not a determined attacker.
- No audit log (single-operator splits, nothing compliance-sensitive).

### What not to touch

- `tab-math-icon/` is the source icon kit (masters + its own spec). Installed
  icons are `src/app/favicon.ico`, `src/app/apple-icon.png`,
  `src/app/manifest.ts` and `public/icon-*.png`.

### Testing

Vitest covers `totals`, `payment-links`, `receipt-errors`, `receipt-url`, the
Gemini fallback flow (mocking `GoogleGenAI` with a real `function`, since the
code calls `new`), and the shared template helpers. The rate limiter's race
safety was verified against live Neon (10 concurrent calls, limit 5, exactly
5 allowed), not unit tested. Route handlers aren't unit tested; exercise them
with `curl` against `npm run dev`.
