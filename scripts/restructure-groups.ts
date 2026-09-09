/**
 * Reorganises the oddíly: exercise, health, food, work and the retrospective
 * become their own, and a few habits move between them.
 *
 * Moving a habit rewrites one field. Recorded values reference the habit, never
 * its group, so nothing measured is read or written here.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { neon } from '@neondatabase/serverless';
import { RETRO_QUESTIONS } from '../lib/retro-questions';

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const sql = neon(url);

const CHECK = [
  { value: 'ano', label: '✓ Splněno', tone: 'good' },
  { value: 'ne', label: '✗ Nesplněno', tone: 'bad' },
];

const GROUPS = [
  { key: 'energie', label: 'Energie', position: 0 },
  { key: 'cviceni', label: 'Cvičení', position: 1 },
  { key: 'zdravi', label: 'Zdraví', position: 2 },
  { key: 'strava', label: 'Strava', position: 3 },
  { key: 'principy', label: 'Principy', position: 4 },
  { key: 'prace', label: 'Práce', position: 5 },
  { key: 'retrospektiva', label: 'Retrospektiva', position: 6 },
  { key: 'uzaverka', label: 'Uzávěrka dne', position: 7 },
];

/** habit key → group key, position within it */
const PLACEMENT: Record<string, [string, number]> = {
  energyMorning: ['energie', 0],
  energyUsed: ['energie', 1],
  kliky: ['cviceni', 0],
  drepy: ['cviceni', 1],
  beh: ['cviceni', 2],
  protahovani: ['zdravi', 0],
  sprcha: ['zdravi', 1],
  shake: ['strava', 0],
  proteinOdpo: ['strava', 1],
  instagram: ['principy', 0],
  resolveNow: ['principy', 1],
  dpMinutes: ['prace', 0],
  betterMe: ['prace', 1],
  retro: ['retrospektiva', 0],
  verdict: ['uzaverka', 0],
  note: ['uzaverka', 1],
};

const NEW_HABITS = [
  {
    key: 'beh',
    label: 'Uběhnuto',
    kind: 'counter',
    config: { min: 0, max: 30, step: 0.1, unit: 'km' },
  },
  {
    key: 'proteinOdpo',
    label: 'Odpolední protein',
    kind: 'choice',
    config: { clearable: true, options: CHECK },
  },
  {
    key: 'betterMe',
    label: 'BetterMe',
    kind: 'duration',
    config: { min: 0, max: 480, step: 15 },
  },
  {
    key: 'retro',
    label: 'Retrospektiva',
    kind: 'retro',
    config: { maxLength: 4000, hideLabel: true, questions: RETRO_QUESTIONS },
  },
];

async function main() {
  const ids = new Map<string, number>();

  for (const g of GROUPS) {
    const [existing] = await sql`select id from habit_groups where key = ${g.key}`;
    if (existing) {
      await sql`update habit_groups set label = ${g.label}, position = ${g.position}, archived_at = null where id = ${existing.id}`;
      ids.set(g.key, existing.id);
    } else {
      const [made] = await sql`insert into habit_groups (key, label, position) values (${g.key}, ${g.label}, ${g.position}) returning id`;
      ids.set(g.key, made.id);
      console.log(`nový oddíl: ${g.label}`);
    }
  }

  for (const h of NEW_HABITS) {
    const [existing] = await sql`select id from habits where key = ${h.key}`;
    if (existing) continue;
    await sql`insert into habits (key, label, kind, config, position)
              values (${h.key}, ${h.label}, ${h.kind}, ${JSON.stringify(h.config)}::jsonb, 0)`;
    console.log(`nový habit: ${h.label}`);
  }

  // The note's prompt does the talking now, so its label comes off.
  await sql`update habits
               set config = config || ${JSON.stringify({
                 hideLabel: true,
                 placeholder: 'Jaký máš z dneška pocit?',
               })}::jsonb
             where key = 'note'`;

  for (const [habitKey, [groupKey, position]] of Object.entries(PLACEMENT)) {
    const groupId = ids.get(groupKey);
    if (!groupId) continue;
    await sql`update habits set group_id = ${groupId}, position = ${position} where key = ${habitKey}`;
  }

  const rows = await sql`
    select g.label oddil, h.label habit
      from habits h left join habit_groups g on g.id = h.group_id
     order by g.position, h.position`;
  let current = '';
  for (const r of rows as { oddil: string; habit: string }[]) {
    if (r.oddil !== current) { current = r.oddil; console.log(`\n▸ ${current}`); }
    console.log(`   ${r.habit}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
