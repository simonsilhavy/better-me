/**
 * Turns the Principy habits from a switch into an explicit ✓ / ✗ choice.
 *
 * A switch has no "unanswered" state: off looks the same whether you failed the
 * principle or never got to it. A two-way choice with no default makes you say
 * which, and colours the answer.
 *
 * Any values already recorded are converted rather than dropped: a switch stores
 * true/false in `flag`, a choice stores its value in `txt`.
 */
import { config } from 'dotenv';

import { refuseProduction } from './guard';

config({ path: '.env.local' });
config();

refuseProduction('Converting principles');

import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const sql = neon(url);

const OPTIONS = [
  { value: 'ano', label: '✓ Splněno', tone: 'good' },
  { value: 'ne', label: '✗ Nesplněno', tone: 'bad' },
];

async function main() {
  for (const key of ['instagram', 'resolveNow']) {
    const [habit] = await sql`select id, kind, config from habits where key = ${key}`;
    if (!habit) {
      console.warn(`Habit "${key}" tu není — přeskakuji.`);
      continue;
    }

    if (habit.kind === 'boolean') {
      const moved = await sql`
        update entry_values
           set txt = case when flag then 'ano' else 'ne' end,
               flag = null
         where habit_id = ${habit.id} and flag is not null
        returning date`;
      console.log(`${key}: převedeno ${moved.length} zapsaných hodnot`);
    }

    const hint = (habit.config as { hint?: string })?.hint;
    await sql`
      update habits
         set kind = 'choice',
             config = ${JSON.stringify({ ...(hint ? { hint } : {}), clearable: true, options: OPTIONS })}::jsonb
       where id = ${habit.id}`;
    console.log(`${key}: nyní volba ✓ / ✗`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
