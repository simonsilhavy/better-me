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
| `/login` | Password gate, when one is configured |

## Access control

The whole app sits behind a 6-digit PIN once **both** `APP_PIN` and
`SESSION_SECRET` are set — middleware redirects anything unauthenticated to
`/login` and answers `/api/*` with `401`. With either variable missing the gate
stays off and the app is open to anyone with the URL.

`/login` is a phone-style keypad that submits on the sixth digit. Six digits is
only a million combinations, so `login_attempts` rate-limits in two layers:

- **Per IP** — two free tries, then a lockout doubling from 30 s to an hour,
  forgotten after 30 quiet minutes. This is the layer an honest typo meets.
- **Globally** — at most 2 failures per rolling hour across every client, then
  everything locks for 15 minutes. Client IP is self-reported at the edge of any
  CDN and a proxy pool grants unlimited identities, so the per-IP layer cannot be
  the last line of defence. This one bounds total guesses regardless of source:
  a few dozen a day against a million combinations.

The counter is incremented inside `ON CONFLICT DO UPDATE`, where Postgres holds
the row lock, so a burst of parallel guesses can't all read the same stale value
and slip through together. A correct PIN is refused while any lockout stands.

The trade-off is deliberate and, at 2 per hour, sharp: three wrong guesses from
anyone locks the app for everyone, so a stranger with the URL can keep the owner
out. Denial of service beats disclosure for a personal tracker.

Sessions are deliberately short-lived. The cookie carries no `Expires`, so it
dies with the browser, and its signed idle window is 15 minutes, slid forward by
middleware on each request. Coming back to the app means entering the PIN again.
Because that can expire mid-entry, the form mirrors unsaved work into
`localStorage` and restores it after logging back in.

Login sets an HTTP-only cookie holding `<expiry>.<hmac>`, signed with
`SESSION_SECRET` and good for a year. The password never reaches the browser,
and because the signing key is independent of it, a stolen cookie can't be
walked back to the password.

A request carrying `Authorization: Bearer $API_TOKEN` bypasses the gate, so
scripts and the chat relay keep working while the UI stays private.

## API

Writes require a bearer token. Reads are open only while the password gate is
off — once it's on, every `/api/*` request needs the same token.

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
4. To make the app private, add `APP_PIN` (six digits) and `SESSION_SECRET`
   (`openssl rand -hex 32`), then redeploy.
5. `npm run db:push` once against the production `DATABASE_URL` to create the table.

## Notes

- Single-user app, so there are no accounts — one PIN, or none.
- The dark theme lives as CSS variables at the top of `app/globals.css`
  (`--win` green / `--loss` red). `better-me.html` wasn't available during the
  port, so the palette is a close reconstruction rather than a byte-exact copy —
  edit those six variables to match the original exactly.
