/**
 * One-off content update for the built-in habits: clearer names, a fourth
 * stretching option, and a meaning on every choice so the control can colour it.
 *
 * Kept out of the habit seed on purpose. That seed never overwrites a habit you
 * have since edited, which is the right default — this is the deliberate
 * exception, run once, and it only touches habits still carrying their
 * original key.
 *
 * Recorded values are untouched: 'horni', 'dolni' and 'cele' keep their
 * meaning, and the new 'zadne' is simply a value nothing has used yet.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error('DATABASE_URL is not set');

async function main() {
  const { habits } = await import('../db/schema');
  const db = drizzle(neon(url!));

  const updates: { key: string; label?: string; config: Record<string, unknown> }[] = [
    {
      key: 'shake',
      label: 'Protein shake',
      config: {
        options: [
          { value: '0', label: '0', tone: 'bad' },
          { value: '1', label: '1', tone: 'partial' },
          { value: '2', label: '2', tone: 'good' },
        ],
      },
    },
    {
      key: 'sprcha',
      label: 'Studená sprcha',
      config: {
        options: [
          { value: 'none', label: 'Žádná', tone: 'bad' },
          { value: 'partial', label: 'Částečná', tone: 'partial' },
          { value: 'full', label: 'Celá', tone: 'good' },
        ],
      },
    },
    {
      key: 'protahovani',
      config: {
        options: [
          { value: 'zadne', label: 'Žádné', tone: 'bad' },
          { value: 'horni', label: 'Horní', tone: 'partial' },
          { value: 'dolni', label: 'Dolní', tone: 'partial' },
          { value: 'cele', label: 'Celé', tone: 'good' },
        ],
      },
    },
    {
      key: 'verdict',
      config: {
        clearable: true,
        hint: 'klikni znovu pro zrušení',
        options: [
          { value: 'win', label: 'Výhra', tone: 'good' },
          { value: 'loss', label: 'Prohra', tone: 'bad' },
        ],
      },
    },
  ];

  for (const u of updates) {
    const [row] = await db.select().from(habits).where(eq(habits.key, u.key)).limit(1);
    if (!row) {
      console.warn(`Habit "${u.key}" tu není — přeskakuji.`);
      continue;
    }
    await db
      .update(habits)
      .set({ ...(u.label ? { label: u.label } : {}), config: u.config })
      .where(eq(habits.key, u.key));
    console.log(`Upraven: ${u.key}${u.label ? ` → „${u.label}“` : ''}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
