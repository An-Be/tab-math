# TabMath

Split a restaurant bill from a photo of the receipt. Snap it, tap who had
what (or just split evenly), share one link — whoever opens it picks their
own name and sees only their total, no login required. The organizer
doesn't need an account either; guest sessions work out of the box.

No money moves through the app. The payer's "Pay" button hands off to
whatever payment handle the organizer has set — Venmo, Cash App, Zelle, or a
Stripe payment link.

## Stack

Built on [tool-template](https://github.com/An-Be/tool-template): Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · hand-rolled monochrome UI · Prisma 7 + Postgres (Neon) · Vitest. Plus Clerk (organizer auth), Uploadthing (receipt photos) and Google Gemini (line-item + tax/tip extraction).

See [`AGENTS.md`](./AGENTS.md) for the shared rules and TabMath's own architecture notes. Read it before making non-trivial changes.

## Setup

```bash
npm install          # also runs `prisma generate` via postinstall
cp .env.example .env # then fill in the values below
npx prisma migrate deploy # with the Neon owner role
npm run dev          # http://localhost:3200
```

### Environment variables

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | [Neon](https://console.neon.tech), **direct** (non-pooled) string for the `tabmath_app` role (`prisma/sql/app-role.sql`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | [Clerk dashboard](https://dashboard.clerk.com) |
| `UPLOADTHING_TOKEN` | [Uploadthing dashboard](https://uploadthing.com/dashboard) |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |

`DIRECT_URL` is required on Vercel: the build fails if the live database doesn't match `schema.prisma`. Never commit `.env`.

## Commands

```bash
npm run dev          # dev server, port 3200
npm run build        # prisma generate + drift check + next build
npm start            # production server, port 3200
npm run lint         # eslint
npm run typecheck    # next typegen + tsc
npm test             # vitest
npx prisma studio    # browse the database
```

## Security

- Organizer routes check ownership per resource (`requireSplitOwner`) and answer 404 for anything not yours.
- Every mutating route checks `Sec-Fetch-Site`/`Origin` and requires JSON (CSRF), caps the body size and validates it with Zod.
- Payer links use 128-bit tokens; payer, organizer and API responses are `no-store` and `noindex`; tokens and ids are redacted from CSP logs.
- Receipt extraction only fetches photos from Uploadthing's own hosts (no SSRF).
- Postgres-backed rate limits on extraction, split creation, uploads and feature votes.
- Nonce-based CSP built by Clerk (report-only for now), HSTS, `X-Frame-Options`, `nosniff`, restrictive `Permissions-Policy`.

## Status

M1 to M3 are complete: split creation, receipt extraction, item assignment, tax/tip, even split, share links, the no-login payer view, payment handles and mark-paid, plus the security pass and the tool-template alignment.
