# TabMath

Split a restaurant bill from a photo of the receipt. Snap it, tap who had
what (or just split evenly), share one link — whoever opens it picks their
own name and sees only their total, no login required. The organizer
doesn't need an account either; guest sessions work out of the box.

No money moves through the app. The payer's "Pay" button hands off to
whatever payment handle the organizer has set — Venmo, Cash App, Zelle, or a
Stripe payment link.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (`base-nova`,
Base UI) · Prisma 7 + Postgres (Neon) · Clerk (organizer auth) · Uploadthing
(receipt photos) · Google Gemini (receipt line-item + tax/tip extraction) ·
Vitest

See [`AGENTS.md`](./AGENTS.md) for the full architecture, conventions, and
known gotchas — read that before making non-trivial changes.

## Setup

```bash
npm install          # also runs `prisma generate` via postinstall
cp .env.example .env # then fill in the values below
npx prisma migrate deploy
npm run dev          # http://localhost:3200
```

### Environment variables

All required, none optional for local dev (see `.env.example`):

| Variable                                                | Where to get it                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                          | [Neon](https://console.neon.tech) — use the **direct** (non-pooled) connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | [Clerk dashboard](https://dashboard.clerk.com)                                        |
| `UPLOADTHING_TOKEN`                                     | [Uploadthing dashboard](https://uploadthing.com/dashboard)                            |
| `GEMINI_API_KEY`                                        | [Google AI Studio](https://aistudio.google.com/apikey)                                |

Never commit `.env` — it's gitignored. `.env.example` has no real values and
is the only env file meant to be tracked.

## Commands

```bash
npm run dev          # dev server, port 3200
npm run build        # prisma generate + next build
npm start             # production server, port 3200
npm run lint          # eslint
npx tsc --noEmit       # typecheck
npm test               # vitest, single run
npm run test:watch     # vitest, watch mode
npx prisma studio      # browse the database
npx prisma migrate dev # create + apply a migration (against real Neon)
```

## Status

M1–M3 of the build are complete: split creation, receipt extraction,
item assignment, tax/tip, even-split, share links, the no-login payer view,
payment handles, and mark-paid. A security/hardening pass and a Postgres-backed
rate limiter are in place. Test coverage currently covers the bill-splitting
math itself (`lib/totals.test.ts`) and payment-link parsing
(`lib/payment-links.test.ts`) — see `AGENTS.md`'s Active Focus section for
what's deliberately not covered yet.
