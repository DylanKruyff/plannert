# Plannert

**ChatGPT finds ideas. Plannert gets everyone to agree.**

Plannert is an AI-powered activity planning app that helps you find things to do,
create a plan, and get your friends to agree on an activity and a time.

The AI is invisible: it finds and ranks options, but the product is about
**creating agreement**. The core success metric is the percentage of plans that
reach agreement.

## Features

- **Prompt-based discovery** — describe what you want ("Find something fun with
  friends this weekend") and get structured activity suggestions.
- **Automatic location** — uses browser geolocation when no location is given,
  then reverse-geocodes coordinates to a city.
- **Shareable invites** — pick an activity, get a link like `/i/7Hd82k`, and
  share it on WhatsApp. Friends don't need an account.
- **Chat-native agreement** — the group negotiates right in WhatsApp: thumbs up
  (or reply) if you're in, no in-app RSVP needed.
- **Anyone can re-plan** — if a friend can't make it, they tap the link to
  change the date/time, edit the event, or swap in a different activity, then
  re-share the updated plan with the group. The link stays the same, so the
  cycle continues.
- **Mobile-first, warm, friendly UI** built with Tailwind + shadcn-style
  components.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with custom warm theme + shadcn-style UI primitives
- **Prisma** ORM + **PostgreSQL**
- **Vercel AI SDK** (`ai`) with **Google Gemini** (`@ai-sdk/google`)
- Fonts: Plus Jakarta Sans + Inter

## Getting started

```bash
npm install
cp .env.example .env   # optional — works without configuration
npm run dev
```

Open http://localhost:3000.

### Works out of the box (no setup required)

Plannert is designed to run with **zero configuration** for local development:

- **No `DATABASE_URL`?** Plans and invites are persisted to a local JSON
  file store (`.plannert-data/`).
- **No AI key?** Preference extraction and activity discovery fall back to a
  built-in deterministic engine (the bundled template activities).

### Enabling PostgreSQL

Set `DATABASE_URL` in `.env`, then push the schema:

```bash
npm run db:push      # create tables from prisma/schema.prisma
npm run db:studio    # optional: browse data
```

#### Local Postgres (no external server needed)

This repo includes a project-local PostgreSQL cluster in `./.pgdata` (running on
port `5433`) so you get a **real database** without Docker or a system service:

```bash
npm run db:start   # start the local Postgres cluster (port 5433)
npm run db:push    # sync the schema (first run only)
npm run db:stop    # stop it when you're done
```

The matching connection string is already in `.env.example`:

```
DATABASE_URL="postgresql://postgres@localhost:5433/plannert?schema=public"
```

### Enabling AI (free)

Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey)
and set it in `.env`:

```
GOOGLE_GENERATIVE_AI_API_KEY="your-key"
```

## API endpoints

| Endpoint                  | Method | Purpose                                       |
| ------------------------- | ------ | --------------------------------------------- |
| `/api/activity/search`       | POST   | Extract preferences, discover real activities via AI |
| `/api/plans/create`          | POST   | Create a plan + invite link from an activity  |
| `/api/plans/[id]`            | GET    | Fetch plan (creator share view)               |
| `/api/invite/[token]`        | GET    | Fetch plan by invite token (friend view)      |
| `/api/invite/[token]/update` | POST   | Edit the plan's activity (date/time or whole event) |

## App routes

- `/` — landing + prompt input
- `/results` — ranked activity cards (also used to swap an activity into an
  existing plan via `?updateToken=`)
- `/plan/[id]` — share link (creator)
- `/i/[token]` — invite page: thumbs-up prompt + edit/re-share (friend)

## Data model

`plans` → `invites` (see `prisma/schema.prisma`). Activities are stored as
**structured JSON** (`activityJson`), never as raw AI text. Negotiation happens
in the group chat, so editing the plan's activity is the only mutation an invite
link grants.

## AI principles

The AI **does**: understand intent, extract preferences, and **discover real,
location-specific activities** — proposing genuine, well-known venues and
activity types for the resolved city, with realistic price ranges, approximate
coordinates, and a Google Maps search link for each.

The AI **never**: invents specific opening hours, ticket availability, or
phone numbers. Dates and times are computed **deterministically** from the
request (the model never reasons about dates/timezones), and when no AI key is
configured the app falls back to a built-in deterministic activity engine.

## Project structure

```
src/
  app/
    api/                 # route handlers
    results/             # results screen
    plan/[id]/           # plan status
    i/[token]/           # invite page
  components/
    ui/                  # button, card, input, badge, modal
    PromptInput, ActivityCard, InviteCard, SharePanel,
    EditDateTimeModal, EditEventModal
  lib/
    ai.ts                # Vercel AI SDK integration: discover/rank activities + fallbacks
    activities.ts        # activity builder + deterministic fallback engine
    store.ts             # Prisma + JSON-file data layer
    geocode.ts           # reverse geocoding
    share.ts, types.ts, utils.ts
```
