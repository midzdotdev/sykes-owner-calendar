# Sykes Owner Calendar

See all the bookings for your [Sykes Cottages](https://www.sykescottages.co.uk) holiday property in your everyday calendar — the one on your phone, tablet or computer. Once it's set up, your bookings appear on their own and stay up to date, so you can tell at a glance when your property is booked, when guests come and go, and which dates you've kept for yourself.

It works with the calendars most people already use, including **Apple Calendar** (iPhone, iPad and Mac), **Google Calendar** and **Microsoft Outlook**.

## Setting it up

You only do this once. After that, the calendar looks after itself.

1. Go to **[sykes-owner-calendar.vercel.app](https://sykes-owner-calendar.vercel.app)**.
2. Enter the email and password you use to sign in to Sykes. (They're scrambled on your own device before anything is sent — see below.)
3. Press **Find my properties**, tick the ones you'd like in your calendar, and press **Create my calendar link**.
4. Press **Copy link**, then add it to your calendar app. Adding a calendar this way is sometimes called *subscribing*; [this short guide](https://help.hospitable.com/en/articles/4605516-how-can-i-add-the-ical-feed-to-the-calendar-on-my-device) shows how on the most popular apps — wherever it asks for a calendar address, paste in your link.

That's everything — your bookings will appear, and the calendar will quietly refresh itself from time to time.

## What you'll see

Each entry covers the nights a property is taken. Guest bookings show the guest's name and how many people are coming, the dates you've reserved for yourself appear as your own bookings, and cancelled bookings are marked as cancelled.

## Please keep your link private

Your calendar link is like a key to your bookings: **anyone who has it can see them.** So:

- Don't share it, email it around, or post it anywhere public.
- Only add it to your own devices.

The good news is that your password is **scrambled inside the link** — it's never written out in plain text and never leaves your device unscrambled. The tool only *reads* your bookings; it never changes anything in your Sykes account.

**To turn off a link** (say you shared it by accident), just change your Sykes password — every old link stops working straight away. Then make a fresh one with your new password.

---

# For developers

Everything below is technical detail. You don't need any of it to use the calendar.

## How it works

A small [Nitro](https://nitro.build) server in TypeScript.

- **Web UI** (`routes/index.get.ts`) — a framework-free page. The browser encrypts the owner's credentials with the server's public key (`public/crypto.js`, Web Crypto), so the plaintext never leaves the device; it then lists the owner's properties and builds a calendar link.
- **Credential tokens** (`lib/token.ts` + `public/crypto.js`) — ECIES: P-256 ECDH + HKDF-SHA256 + AES-256-GCM, no dependencies. The server decrypts with its private key (`TOKEN_PRIVATE_KEY`).
- **Routes:**
  - `GET /` — the web UI.
  - `GET /api/pubkey` — the server's public key.
  - `POST /api/properties {token}` — the owner's properties, or a typed error.
  - `GET /c/<token>` — calendar feed for a token (merges the selected properties).
- **Scraping** (`lib/http/`) — sign in (`getAuthenticatedSession`, throws `AuthError`), list properties (`getProperties`), read bookings (`getPropertyBookings`, throws `ExtractionError` on a markup change), via [cheerio](https://cheerio.js.org) + [zod](https://zod.dev). Calendars are built with [ical-generator](https://github.com/sebbo2002/ical-generator) (`lib/ical.ts`).

## Requirements

- Node.js 24 (pinned via `engines.node` and `packageManager` / corepack)

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build the production server into `.output/` |
| `npm run preview` | Run the built server |
| `npm test` | Unit tests (Vitest) — watch locally, single run in CI |
| `npm run typecheck` | `tsc --noEmit` (Nitro's build does not type-check) |
| `npm run test:e2e` | End-to-end smoke of the built server (web UI + `/c` feed), Sykes mocked from fixtures |
| `npm run test:e2e:live` | Same, against the real Sykes site (needs `SYKES_*`) |

## Secrets

| Secret | Where | How |
|---|---|---|
| `TOKEN_PRIVATE_KEY` (decrypts calendar links) | local `.env` + **Vercel** (mark Sensitive) + offline backup | `node scripts/generate-token-key.mjs`, then put `.token-key.pem` into Vercel |
| `SYKES_*` (live check only) | **GitHub Actions** | `gh secret set -f .env.ci` |

`TOKEN_PRIVATE_KEY` is a value you own — it works on any host, so moving off Vercel never invalidates links (just set the same value on the new host). Rotating it *does* invalidate every link. Copy `.env.example` to `.env` for local development.

## Continuous integration

- `.github/workflows/ci.yml` — typecheck + unit + fixture e2e on every pull request (Node 24).
- `.github/workflows/e2e-live.yml` — weekly (and on-demand) check that the **deployed** app still serves a real calendar, catching upstream Sykes changes. It hits the production endpoint directly; Sykes does not block Vercel's IPs, so no tunnel is needed.

## Deployment

Vercel via Nitro's Vercel preset; Node pinned to `24.x` via `engines.node`.

## Contributing

`main` is protected — changes go through a pull request, and the `test` check must pass with the branch up to date.
