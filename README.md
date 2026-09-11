# Better Me

Daily tracker — Next.js (App Router) + Neon Postgres + Drizzle, deployed on Vercel.
Replaces the single-file `better-me.html` artifact whose data lived hardcoded in
`seedDefaults()`.

> **Complete documentation in Czech — including the reasoning behind the design
> and a from-scratch build guide — is in [`docs/DOKUMENTACE.md`](docs/DOKUMENTACE.md).**
> This file is the English technical summary.

## The rule the app is built on

**Celebrate that a day was written down — never how the day went.** The reward
belongs to the honesty of the record, not to the result.

An app that celebrates a win, a completed habit, or a long streak of good days
raises the price of admitting a bad one, and so corrupts its own data. The worst
form of that mistake is a screen where an unrecorded day looks better than an
honestly recorded bad one.

What follows from it:

- **may be highlighted** — days recorded, days recorded in a row, how much of
  today is filled in, finishing the entry
- **may not** — win counts, win streaks, a "score for the day", anything that
  makes a good result the condition for praise

Results are shown, and should be — as information to read, not as a reward or a
punishment. The verdict control and the colours on choice buttons describe what
happened; they do not judge the person, and they stay.

Every change gets measured against this. `CLAUDE.md` carries the same rule for
whoever works on the code next.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS v4
- Drizzle ORM + `@neondatabase/serverless`
- Recharts for the per-habit detail chart; the heatmap, sparklines and the two
  Přehled views are hand-drawn, so they cost nothing

## Routes

| Route | What |
| --- | --- |
| `/` | Today's entry (date resolved in `Europe/Prague`, not server UTC) |
| `/den/[date]` | Any specific day, deep-linkable; prev/next arrows kept |
| `/historie` | Period picker, recording stats, calendar heatmap, per-habit trend cards |
| `/historie/[key]` | One habit: chart, period figures, the days it was recorded |
| `/denik` | Everything ever written in notes and retrospectives; search, filter by question |
| `/prehled` | Two analytical views; stays closed until 30 days are recorded |
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

A session lasts 3 minutes without a heartbeat; an open page beats every minute
and beats again the moment it becomes visible. Close the tab or the browser and
the session lapses within that window, so coming back means entering the PIN
again. **The window is the honest limit: reopening within ~3 minutes still gets
you in.**

It cannot be much shorter. Browsers throttle and eventually freeze timers in
background tabs, so a window of seconds ended sessions while the app was merely
behind another app for a moment.

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
and `duration` go to `num`; `choice`, `text` and `retro` to `txt`; `boolean` to
`flag`. A `retro` value also writes `meta`, holding the id of the question it
answered.

Every habit you actually answered gets a row, including one whose value happens
to equal the default — "Žádné" chosen deliberately is an answer, and storing it
is what separates it from a habit you skipped. A habit with no row is one you
never touched, which is what makes "how much of today did I fill in" answerable.

Numbers are snapped to the habit's step and then rounded to that step's own
precision: snapping to a fractional step leaves binary-float debris (`3 * 0.1`
is `0.30000000000000004`) that would otherwise be stored and displayed as-is.

`habit_groups.config` carries per-group presentation — currently just `emoji`,
which drives the completion flourish. It is a property of the group, not a
hardcoded group name, so it survives renaming and can be edited later.

`entry_values.habit_id` is `ON DELETE RESTRICT`: the database refuses to drop a
habit that has history, so data can only be lost through an explicit, confirmed
delete — never as a side effect.

`habits.role` marks the habit the statistics lean on (`verdict` counts wins and
losses, `note` shows in history lists). Both are ordinary, removable habits;
when the verdict habit is gone the history screen drops those tiles rather than
rendering zeros.

The streak counts **days recorded in a row**, not wins — see the rule at the top.
An unfinished today does not break it: the count starts from yesterday whenever
today is still empty, because a day still in progress is not a missed day.

## The entry screen

The form shortens as it gets filled in. A group that reaches its full count
folds itself away after a short pause and leaves one line behind saying what is
inside it, so nothing disappears out of sight. The pause exists so the fold
never lands under a finger still working — any further change restarts it — and
folding by hand always wins over the automatic one.

Progress sits under the header as a thin line rather than a sentence: length
reads without being read, and it gives the form a visible end to walk towards.

The day saves itself a second and a half after the last change. The button
stays, for the sense of a full stop and as the way to retry after an error.
Anything typed while a save is in flight still counts as unsaved, so the bar
does not claim a clean slate it does not have.

### Finishing a group

Three layers, each firing at a different rate so they do not take weight from
one another:

- every group, on completion — the counter flips to `✓ hotovo` and the header
  takes a faint green wash
- **Cvičení only** — an emoji lifts out of the counter
- once a day, when the last habit is filled — one line across the bottom

The emoji is the one place the rule at the top gets tested, so it is worth
stating exactly. It fires when the group is complete **and at least one value is
above zero** — one push-up or a hundred metres is enough. It rewards *that
something happened*, never how much, and the bar sits low enough that clearing
it honestly costs less than faking it. Two things keep it honest:

- **It must never scale.** One push-up and a hundred fire the identical emoji,
  same size, same duration. Scaling it would make it a reward for performance.
- **It waits for the value to settle.** A slider already at zero can only be
  answered by dragging away and back, so every honest "none today" sweeps
  through real numbers on the way. Without the pause the flourish would fire on
  a rest day, for values passed through rather than kept.

Recording a day of zeros still gets the `✓ hotovo`, so honesty is never left
without a response — the emoji is a bonus on top, not the only acknowledgement.

## Deník

Notes and retrospective answers used to be write-only: the app asked a question
every evening and then had nowhere to show the answer. `/denik` lists them
newest first, with full-text search.

Because every retro answer stores the id of the question it answered, filtering
by question is a plain equality check — the same prompt lines up across months
even after its wording changes. The text shown is always the current wording, so
a fixed typo reads correctly in old entries too. Tapping the prompt above any
answer opens every answer to it, newest first.

That filter is why the question set is deliberately small: with one prompt a
day, the length of `lib/retro-questions.ts` *is* how often a question comes
back. Thirty-six entries means roughly monthly, about ten answers a year to the
same prompt — a series you can read. A hundred prompts gave three a year, which
is not.

## Přehled

Two views, each one pass over the data, no charting library:

- **Co táhne výhru** — the win rate on days a habit showed activity against days
  it did not, sorted by the gap in percentage points.
- **Den v týdnu** — the same by day of the week.

Both are correlations and nothing more, which is easy to forget once a number is
on screen. Three guards keep them from reading as advice:

- the whole page stays closed until **30 days** are recorded (`MIN_TOTAL_DAYS`)
- a habit with fewer than **10 days** on either side (`MIN_GROUP_DAYS`) is listed
  by name under the chart instead of getting a number
- the wording says things *go together*, never that one causes the other

A day with no value recorded for a habit counts on neither side: a habit you
skipped is not a claim that you did not do it.

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
npm run db:seed:habits   # 8 groups and 16 habits — safe to re-run
npm run db:seed          # day records from seed-data.json
npm run db:retro         # push lib/retro-questions.ts into the live habit
```

Rehearsed from an empty database: dropping every table, replaying `drizzle/` and
re-seeding reproduces the same 8 groups and 16 habits — including the 💪 on
Cvičení, the 36 retrospective questions and the 0.1 km step — and running any
of them again changes nothing.

`db:retro` refuses to write when a question id that some stored answer points at
has disappeared from the set, and exits non-zero. Ids are the contract: rewording
a question is safe, reusing or deleting an id orphans the answers that reference
it.

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
- The UI is Czech throughout; code, comments and this file are English.
- Retrospective questions live in `lib/retro-questions.ts` as the single source;
  both seed scripts import it. Editing them from the UI is not built yet.
- `seed-data.json` still ships as `[]` — the historical days were never
  imported.
