# Better Me

Daily tracker — Next.js (App Router) + Neon Postgres + Drizzle, deployed on Vercel.
Replaces the single-file `better-me.html` artifact whose data lived hardcoded in
`seedDefaults()`.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS v4
- Drizzle ORM + `@neondatabase/serverless`
- Recharts for the 14-day chart

## Routes

| Route | What |
| --- | --- |
| `/` | Today's entry (date resolved in `Europe/Prague`, not server UTC) |
| `/day/[date]` | Any specific day, deep-linkable; prev/next arrows kept |
| `/history` | Win/loss + streak stats, 14-day bar chart, full clickable history |

## API

Reads are open, writes require a bearer token.

```
GET /api/entries                          # every entry, newest first
GET /api/entries?from=2026-07-01&to=2026-07-31
GET /api/entries/2026-09-02
PUT /api/entries/2026-09-02                # upsert — Authorization: Bearer $API_TOKEN
```

`PUT` body (every field optional; omitted fields fall back to the empty-day default):

```json
{
  "energyMorning": 70,
  "energyUsed": 50,
  "kliky": 60,
  "drepy": 40,
  "shake": 1,
  "sprcha": "full",
  "protahovani": "cele",
  "dpMinutes": 90,
  "instagram": true,
  "resolveNow": false,
  "verdict": "win",
  "note": "dobrý den"
}
```

Out-of-range numbers are clamped and snapped to their step, and unknown enum
values fall back to the default — a malformed payload can't corrupt a row.
If `API_TOKEN` is unset, `PUT` returns `503` and writes are disabled entirely.

Example:

```bash
curl -X PUT https://<app>.vercel.app/api/entries/2026-09-02 \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"energyMorning":70,"kliky":60,"verdict":"win","note":"ok"}'
```

## Data model

One row per day, `date` (`YYYY-MM-DD`) as the primary key — see `db/schema.ts`.

## Local setup

```bash
npm install
cp .env.example .env.local     # fill in DATABASE_URL (+ API_TOKEN if you want writes)
npm run db:push                # create the table
npm run dev
```

## Seeding history

The 45-day backlog (2026-07-02 → 2026-09-02) goes into `seed-data.json` as a
plain array of entry objects, then:

```bash
npm run db:seed
```

Upserts by date, so re-running is safe. The file currently ships as `[]`.

## Deploy

1. Import the repo in Vercel.
2. Vercel dashboard → **Storage → Neon** — the integration injects `DATABASE_URL`.
3. Add `API_TOKEN` (`openssl rand -hex 32`) if you want API writes.
4. `npm run db:push` once against the production `DATABASE_URL` to create the table.

## Notes

- No auth on the UI (single-user app, deliberate). The URL is the only thing
  standing between the data and the internet; only the API's write path is
  token-guarded.
- The dark theme lives as CSS variables at the top of `app/globals.css`
  (`--win` green / `--loss` red). `better-me.html` wasn't available during the
  port, so the palette is a close reconstruction rather than a byte-exact copy —
  edit those six variables to match the original exactly.
