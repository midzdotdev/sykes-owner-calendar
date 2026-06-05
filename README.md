# Sykes Owner Calendar

See all the bookings for your [Sykes Cottages](https://www.sykescottages.co.uk) holiday property in your everyday calendar — the one on your phone, tablet or computer. Once it's set up, your bookings appear on their own and stay up to date, so you can tell at a glance when your property is booked, when guests come and go, and which dates you've kept for yourself.

It works with the calendars most people already use, including **Apple Calendar** (iPhone, iPad and Mac), **Google Calendar** and **Microsoft Outlook**.

## Setting it up

You only do this once. After that, the calendar looks after itself.

### Step 1 — Make your personal calendar link

Start with this web address:

```
https://sykes-owner-calendar.vercel.app/bookings/PROPERTY-NUMBER?email=YOUR-EMAIL&password=YOUR-PASSWORD
```

Now swap in your own details in place of the three capitalised words:

- **PROPERTY-NUMBER** — the number for your property (see *Finding your property number* below).
- **YOUR-EMAIL** — the email address you use to sign in to Sykes.
- **YOUR-PASSWORD** — the password you use to sign in to Sykes.

A finished link might look like this:

```
https://sykes-owner-calendar.vercel.app/bookings/21953?email=jane@example.com&password=mypassword
```

### Step 2 — Add the link to your calendar

Adding a calendar this way is sometimes called *subscribing* to it. [This short guide](https://help.hospitable.com/en/articles/4605516-how-can-i-add-the-ical-feed-to-the-calendar-on-my-device) walks through how to do it in the most popular apps. Wherever it asks you to paste a calendar address, paste in your personal link from Step 1.

That's everything — your bookings will appear, and the calendar will quietly refresh itself from time to time.

## Finding your property number

1. Sign in to your Sykes Cottages account.
2. Open your **Bookings** page.
3. If you have more than one property, choose the one you want from the menu near the top.
4. Look at the web address along the very top of your browser. It ends in a number, and that number is your property number. (For example, in `.../owner/bookings/21953`, the property number is **21953**.)

## What you'll see

Each entry covers the nights a property is taken. Guest bookings show the guest's name and how many people are coming, the dates you've reserved for yourself appear as your own bookings, and cancelled bookings are marked as cancelled.

## Please keep your link private

Your personal link contains your Sykes email and password. That means **anyone who has the link can see your bookings — and could sign in to your Sykes account.** Treat the link like a house key:

- Don't share it, email it around, or post it anywhere public.
- Only add it to your own devices.

**Why does it need my password?** The only way to read your bookings is to sign in to Sykes for you, exactly as you would yourself — there's genuinely no way around it. The tool only *reads* your bookings; it never changes anything in your account.

**If you ever change your Sykes password**, your link will stop working. Just make a new link with your new password (Step 1) and add it to your calendar again.

Use this at your own discretion.

---

# For developers

Everything below is technical detail. You don't need any of it to use the calendar.

## How it works

A small [Nitro](https://nitro.build) server written in TypeScript. When a request comes in for `/bookings/:propertyId`:

1. It signs in to Sykes Cottages with the supplied email/password — `lib/http/getAuthenticatedSession.ts` (throws a clear error if the login is rejected).
2. It scrapes the owner bookings page with [cheerio](https://cheerio.js.org) (`lib/http/getPropertyBookings.ts`) and validates each row against a [zod](https://zod.dev) schema (`lib/booking-schema.ts`).
3. It builds an iCalendar document with [ical-generator](https://github.com/sebbo2002/ical-generator) (`lib/ical.ts`, dates via [date-fns](https://date-fns.org)) and returns it as `text/calendar`.

Any other path redirects to this repository (`routes/[...fallback].ts`).

## Requirements

- Node.js 24 (pinned via `engines.node` and `packageManager` / corepack)

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run the dev server |
| `npm run build` | Build the production server into `.output/` |
| `npm run preview` | Run the built server |
| `npm test` | Unit tests (Vitest) — watch mode locally, single run in CI |
| `npm run typecheck` | `tsc --noEmit` (Nitro's build does not type-check) |
| `npm run test:e2e` | End-to-end smoke test of the built server, with Sykes calls mocked from fixtures |
| `npm run test:e2e:live` | Same, against the real Sykes site (needs the `SYKES_*` env vars below) |

## Testing layers

- **Unit** (`lib/**/*.test.ts`) — schema transforms, ICS generation (snapshot), cookie/auth helpers, and scraper parsing against a sanitized real-DOM fixture.
- **Fixture e2e** (`test/e2e/`) — boots the built server and checks it serves a valid calendar over HTTP, with Sykes mocked from fixtures. Offline and deterministic; runs on every pull request.
- **Live e2e** — the same end-to-end check against the real site (`SMOKE_MODE=live` plus `SYKES_EMAIL` / `SYKES_PASSWORD` / `SYKES_PROPERTY_ID`). It catches upstream breakage — a failed sign-in or changed page markup — before users do.

## Continuous integration

- `.github/workflows/ci.yml` — typecheck + unit + fixture e2e on every pull request (Node 24).
- `.github/workflows/e2e-live.yml` — the live check, on merge to `main`, weekly, and on demand.

Sykes blocks GitHub's datacenter IP addresses, so the live workflow tunnels **only** the Sykes requests through a residential [Tailscale](https://tailscale.com) exit node: the action brings up `tailscaled` in userspace mode with an HTTP proxy, and the live step sets `HTTPS_PROXY` + `NODE_USE_ENV_PROXY` so just the server's outbound `fetch` egresses via the exit node. Required repo secrets / variables: `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET`, `TS_EXIT_NODE`, `SYKES_EMAIL`, `SYKES_PASSWORD`, `SYKES_PROPERTY_ID`.

## Deployment

Deployed on Vercel via Nitro's Vercel preset; the Node version is pinned to `24.x` through `engines.node`.

## Contributing

`main` is protected — changes go through a pull request, and the `test` check must pass with the branch up to date.
