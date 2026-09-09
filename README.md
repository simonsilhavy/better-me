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
| `/den/[date]` | Any specific day, deep-linkable; prev/next arrows kept |
| `/historie` | Period picker, verdict stats, calendar heatmap, per-habit trend cards |
| `/historie/[key]` | One habit: chart, period figures, the days it was recorded |
| `/nastaveni` | Groups and habits: create, rename, reorder, move, archive, delete |
| `/login` | PIN gate, when one is configured |

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

A correct PIN clears both counters, the global one included: it proves the owner
is at the keypad, which retires the question the global ceiling exists to ask.
Without that, ordinary typos accumulated across successful logins until an
innocent-looking mistake tripped a lockout with no visible cause.

The counter is incremented inside `ON CONFLICT DO UPDATE`, where Postgres holds
the row lock, so a burst of parallel guesses can't all read the same stale value
and slip through together. A correct PIN is refused while any lockout stands.

The trade-off is deliberate and, at 2 per hour, sharp: three wrong guesses from
anyone locks the app for everyone, so a stranger with the URL can keep the owner
out. Denial of service beats disclosure for a personal tracker.

Sessions live in the `sessions` table, not inside the cookie, which holds only
an opaque id. A self-contained signed cookie cannot be revoked, and browsers
restore session cookies when they reopen ("continue where you left off"), so
closing the browser did not actually end the session — the cookie came back
intact and still verified.

A session lasts 45 seconds without a heartbeat; an open page beats every 15 s.
Close the tab or the browser and the session lapses within that window, so
coming back means entering the PIN again. **The window is the honest limit:
reopening within ~45 seconds still gets you in.**

An earlier version also sent a `pagehide` beacon so a close ended the session
instantly. It was removed: `pagehide` fires on ordinary same-tab navigation too,
where it revoked the session the incoming page was about to use, and because
cookies are shared across an origin's pages a departing page could not reliably
distinguish its own session from its successor's. Being logged out at random
mid-use is worse than a short predictable window.

Because a session can end mid-entry, the form mirrors unsaved work into
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

Fields are habit keys. Out-of-range numbers are clamped and snapped to the
habit's step, and unknown choices fall back to its default, so a malformed
payload can't corrupt a row. Keys matching no habit come back in `ignoredKeys`
rather than being dropped in silence. Responses always carry every active
habit, recorded or not, so a day can be read, edited and written back whole.
If `API_TOKEN` is unset, `PUT` returns `503` and writes are disabled entirely.

Example:

```bash
curl -X PUT https://<app>.vercel.app/api/entries/2026-09-02 \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"energyMorning":70,"kliky":60,"verdict":"win","note":"ok"}'
```

## Data model

Four tables, in `db/schema.ts`:

| Table | Holds |
| --- | --- |
| `habit_groups` | your named groups — Zdraví, Principy, Uzávěrka dne |
| `habits` | what is tracked: key, label, kind, config, group, role |
| `entries` | one row per day that was touched |
| `entry_values` | one recorded value per day per habit |

Values reference the **habit**, never the group, so moving a habit between
groups changes one field in `habits` and touches no recorded data at all.

A habit's `kind` picks its control and its storage column: `scale`, `counter`
and `duration` go to `num`; `choice` and `text` to `txt`; `boolean` to `flag`.

Only values that differ from a habit's default are stored, which is what makes
"how much of today did I fill in" answerable — a habit with no row is one you
skipped.

`entry_values.habit_id` is `ON DELETE RESTRICT`: the database refuses to drop a
habit that has history, so data can only be lost through an explicit, confirmed
delete — never as a side effect.

`habits.role` marks the habit the statistics lean on (`verdict` drives win/loss
streaks, `note` shows in history lists). Both are ordinary, removable habits;
when the verdict habit is gone the history screen drops those tiles rather than
rendering zeros.

## History figures

Counters and durations are summed over a period; a percentage is averaged over
the days it was recorded; choices and switches have no scale, so what is counted
there is how many days they were recorded at all. Each period is compared with
the window of equal length immediately before it, which is what keeps the change
percentage meaningful when you switch from 7 days to 90.

Group-level totals are deliberately absent. A habit moved between groups would
make the same past month total differently, because groups are read as they are
now, not as they were then — so every figure in Historie belongs to one habit.

## Migrations

Schema changes are versioned files under `drizzle/`, applied with
`npm run db:migrate`. Generate a new one with `npm run db:generate` after
editing `db/schema.ts`, and read the SQL before applying it.

## Local setup

```bash
npm install
cp .env.example .env.local     # fill in DATABASE_URL (+ API_TOKEN if you want writes)
npm run db:migrate             # create the tables
npm run db:seed:habits         # groups and habits
npm run dev
```

## Seeding

```bash
npm run db:seed:habits   # 5 groups and 12 habits — safe to re-run
npm run db:seed          # day records from seed-data.json
```

Both were rehearsed from an empty database: dropping every table, replaying
`drizzle/` and re-seeding reproduces the same 5 groups and 12 habits, and
running either again changes nothing.

`seed-data.json` is an array of day objects whose fields are habit keys, i.e.
exactly what `PUT /api/entries/:date` accepts. It ships as `[]`. Both upsert, so
re-running is safe; the habit seed never overwrites a habit you have since
edited.

## Deploy

1. Import the repo in Vercel.
2. Vercel dashboard → **Storage → Neon** — the integration injects `DATABASE_URL`.
3. Add `API_TOKEN` (`openssl rand -hex 32`) if you want API writes.
4. To make the app private, add `APP_PIN` (six digits) and `SESSION_SECRET`
   (`openssl rand -hex 32`), then redeploy.
5. `npm run db:migrate` and `npm run db:seed:habits` once against the production `DATABASE_URL`.

## Notes

- Single-user app, so there are no accounts — one PIN, or none.
- The dark theme lives as CSS variables at the top of `app/globals.css`
  (`--win` green / `--loss` red). `better-me.html` wasn't available during the
  port, so the palette is a close reconstruction rather than a byte-exact copy —
  edit those six variables to match the original exactly.
