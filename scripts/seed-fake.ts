/**
 * Fills the development database with invented days.
 *
 * The real diary belongs in production, behind the PIN. Development still
 * needs enough days for Přehled to switch on (30) and for streaks and the
 * heatmap to have something to draw, so it gets days that look plausible and
 * mean nothing.
 *
 * Three things make this a test fixture rather than filler:
 *
 *  - **Deterministic.** A fixed seed means every run produces the same days,
 *    so a screenshot from last week still matches what is on screen today.
 *  - **A planted signal.** Cold showers and the Instagram rule are wired to
 *    raise the chance of a win by a known amount, so "Co táhne výhru" has a
 *    right answer to be checked against instead of just "some number".
 *  - **Gaps.** Roughly one day in six is missing, because a run of unbroken
 *    days would never exercise the streak logic the way real use does.
 *
 * Wipes existing days first — running it twice gives the same database, not
 * two overlapping sets.
 */
import { config } from 'dotenv';

import { refuseProduction } from './guard';

config({ path: '.env.local' });
config();

refuseProduction('Seeding invented days');

/** Days of history to lay down, counting back from today. */
const SPAN_DAYS = 120;

/** Share of days left unrecorded. */
const GAP_RATE = 1 / 6;

/** How much a cold shower and the Instagram rule each lift the win chance. */
const SPRCHA_LIFT = 0.25;
const INSTAGRAM_LIFT = 0.2;

/**
 * Small deterministic generator (mulberry32). `Math.random()` would give
 * different data on every run, and then nothing built on this could be
 * compared against anything.
 */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOTES = [
  'Vymyšlený den pro testování. Nic z toho se nestalo.',
  'Testovací záznam — text slouží jen k vyzkoušení hledání v Deníku.',
  'Ukázkový den. Ráno práce, odpoledne nic zvláštního.',
  'Smyšlená poznámka. Delší, aby bylo vidět, jak se text zalamuje přes víc řádků a jak se chová výpis.',
  'Zkušební zápis. Dopoledne schůzka, večer klid.',
  'Vygenerovaný den bez obsahu.',
  'Testovací text s diakritikou: příliš žluťoučký kůň úpěl ďábelské ódy.',
  'Ukázka kratší poznámky.',
];

const RETRO_ANSWERS = [
  'Vymyšlená odpověď pro testování.',
  'Testovací text — na tuhle otázku nikdo doopravdy neodpovídal.',
  'Ukázková odpověď, delší, aby bylo vidět zalomení i v Deníku a ve filtru podle otázky.',
  'Zkušební odpověď.',
];

async function main() {
  const { neon } = await import('@neondatabase/serverless');
  const { upsertDay } = await import('../lib/entries');
  const { questionForDate } = await import('../lib/retro');
  const { getHabits } = await import('../lib/entries');

  const sql = neon(process.env.DATABASE_URL!);

  const before = (await sql`select count(*)::int as n from entries`) as { n: number }[];
  await sql`delete from entries`;
  console.log(`smazáno dní: ${before[0]?.n ?? 0}`);

  const habits = await getHabits();
  const retroHabit = habits.find((h) => h.key === 'retro');

  const rand = rng(20260914);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
  const step = (max: number, s: number) => Math.round((rand() * max) / s) * s;

  const today = new Date('2026-09-14T12:00:00Z');
  let written = 0;

  for (let back = SPAN_DAYS - 1; back >= 0; back--) {
    if (rand() < GAP_RATE) continue;

    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - back);
    const date = d.toISOString().slice(0, 10);

    const sprcha = pick(['none', 'partial', 'full'] as const);
    const instagram = rand() < 0.6 ? 'ano' : 'ne';

    // The planted signal: a baseline coin flip nudged by two habits.
    let winChance = 0.35;
    if (sprcha === 'full') winChance += SPRCHA_LIFT;
    if (instagram === 'ano') winChance += INSTAGRAM_LIFT;

    const values: Record<string, unknown> = {
      energyMorning: step(100, 10),
      energyUsed: step(100, 10),
      kliky: rand() < 0.7 ? step(150, 5) : 0,
      drepy: rand() < 0.4 ? step(100, 5) : 0,
      beh: rand() < 0.2 ? Math.round(rand() * 80) / 10 : 0,
      protahovani: pick(['zadne', 'horni', 'dolni', 'cele'] as const),
      sprcha,
      shake: pick(['0', '1', '2'] as const),
      proteinOdpo: rand() < 0.5 ? 'ano' : 'ne',
      instagram,
      resolveNow: rand() < 0.55 ? 'ano' : 'ne',
      dpMinutes: rand() < 0.35 ? step(180, 15) : 0,
      betterMe: rand() < 0.3 ? step(120, 15) : 0,
      verdict: rand() < winChance ? 'win' : 'loss',
    };

    // Not every day gets written in — the same is true of real use, and the
    // Deník has to look right when some days have nothing.
    if (rand() < 0.75) values.note = pick(NOTES);
    if (rand() < 0.5 && retroHabit) {
      values.retro = { q: questionForDate(retroHabit, date)?.id ?? '', a: pick(RETRO_ANSWERS) };
    }

    await upsertDay(date, values);
    written++;
  }

  const after = (await sql`
    select count(*)::int as dny, (select count(*)::int from entry_values) as hodnoty from entries
  `) as { dny: number; hodnoty: number }[];

  console.log(`zapsáno vymyšlených dní: ${written}`);
  console.log(`v databázi: ${after[0].dny} dní, ${after[0].hodnoty} hodnot`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
