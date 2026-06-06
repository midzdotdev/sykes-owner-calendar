# Developer guide

Technical detail for building and running Sykes Owner Calendar. You don't need any of this to *use* the calendar — see the [README](README.md) for that.

## How it works

A small [Nitro](https://nitro.build) server in TypeScript.

- **Web UI** (`routes/index.get.ts`) — a framework-free page, styled after sykescottages.co.uk. The browser encrypts the owner's credentials with the server's public key (`public/crypto.js`, Web Crypto), so the plaintext never leaves the device; it then lists the owner's properties and builds either a calendar per property or one combined calendar.
- **Credential tokens** (`lib/token.ts` + `public/crypto.js`) — ECIES: P-256 ECDH + HKDF-SHA256 + AES-256-GCM, no dependencies. The server decrypts with its private key (`TOKEN_PRIVATE_KEY`).
- **Routes:**
  - `GET /` — the web UI.
  - `GET /api/pubkey` — the server's public key.
  - `POST /api/properties {token}` — the owner's properties, or a typed error.
  - `GET /c/<token>` — the calendar feed for a token: one property, a chosen set, or `all` (resolved live, so new properties are picked up). Combined feeds prefix each event with its property.
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
