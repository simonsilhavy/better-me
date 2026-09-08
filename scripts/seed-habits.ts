/**
 * Creates the starting set of groups and habits — the nine trackers that used
 * to be columns, plus verdict and note, which are now ordinary habits.
 *
 * Idempotent: matches on `key`, so re-running updates labels and configuration
 * without touching recorded values or anything you have since rearranged.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { habitGroups, habits } from '../db/schema';

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const db = drizzle(neon(url));

type SeedHabit = {
  key: string;
  label: string;
  kind: string;
  config: Record<string, unknown>;
  role?: 'verdict' | 'note';
};

const PLAN: { key: string; label: string; habits: SeedHabit[] }[] = [
  {
    key: 'energie',
    label: 'Energie',
    habits: [
      { key: 'energyMorning', label: 'Energie ráno', kind: 'scale', config: { min: 0, max: 100, step: 10, unit: '%' } },
      { key: 'energyUsed', label: 'Energie využitá', kind: 'scale', config: { min: 0, max: 100, step: 10, unit: '%' } },
    ],
  },
  {
    key: 'zdravi',
    label: 'Zdraví',
    habits: [
      { key: 'kliky', label: 'Kliky', kind: 'counter', config: { min: 0, max: 250, step: 5 } },
      { key: 'drepy', label: 'Dřepy', kind: 'counter', config: { min: 0, max: 250, step: 5 } },
      {
        key: 'shake',
        label: 'Shake',
        kind: 'choice',
        config: { options: [{ value: '0', label: '0' }, { value: '1', label: '1' }, { value: '2', label: '2' }] },
      },
      {
        key: 'sprcha',
        label: 'Sprcha',
        kind: 'choice',
        config: {
          options: [
            { value: 'none', label: 'Žádná' },
            { value: 'partial', label: 'Částečná' },
            { value: 'full', label: 'Celá' },
          ],
        },
      },
      {
        key: 'protahovani',
        label: 'Protahování',
        kind: 'choice',
        config: {
          clearable: true,
          hint: 'klikni znovu pro zrušení',
          options: [
            { value: 'horni', label: 'Horní' },
            { value: 'dolni', label: 'Dolní' },
            { value: 'cele', label: 'Celé' },
          ],
        },
      },
    ],
  },
  {
    key: 'principy',
    label: 'Principy',
    habits: [
      { key: 'instagram', label: 'Instagram', kind: 'boolean', config: { hint: 'pravidlo drženo do 17:00' } },
      { key: 'resolveNow', label: 'Co otevřu, dořeším', kind: 'boolean', config: {} },
    ],
  },
  {
    key: 'prace',
    label: 'Práce',
    habits: [
      { key: 'dpMinutes', label: 'Daňová Pohoda', kind: 'duration', config: { min: 0, max: 480, step: 15 } },
    ],
  },
  {
    key: 'uzaverka',
    label: 'Uzávěrka dne',
    habits: [
      {
        key: 'verdict',
        label: 'Verdikt',
        kind: 'choice',
        role: 'verdict',
        config: {
          clearable: true,
          hint: 'klikni znovu pro zrušení',
          options: [
            { value: 'win', label: 'Výhra' },
            { value: 'loss', label: 'Prohra' },
          ],
        },
      },
      {
        key: 'note',
        label: 'Poznámka',
        kind: 'text',
        role: 'note',
        config: { maxLength: 4000, placeholder: 'Jak to dneska šlo…' },
      },
    ],
  },
];

async function main() {
  let groupsWritten = 0;
  let habitsWritten = 0;

  for (const [gi, group] of PLAN.entries()) {
    const [existingGroup] = await db
      .select()
      .from(habitGroups)
      .where(eq(habitGroups.key, group.key))
      .limit(1);

    let groupId: number;
    if (existingGroup) {
      groupId = existingGroup.id;
    } else {
      const [created] = await db
        .insert(habitGroups)
        .values({ key: group.key, label: group.label, position: gi })
        .returning({ id: habitGroups.id });
      groupId = created.id;
      groupsWritten++;
    }

    for (const [hi, habit] of group.habits.entries()) {
      const [existing] = await db
        .select()
        .from(habits)
        .where(eq(habits.key, habit.key))
        .limit(1);

      if (existing) continue; // never overwrite a habit you have since edited

      await db.insert(habits).values({
        groupId,
        key: habit.key,
        label: habit.label,
        kind: habit.kind,
        config: habit.config,
        role: habit.role ?? null,
        position: hi,
      });
      habitsWritten++;
    }
  }

  console.log(`Oddílů vytvořeno: ${groupsWritten}, habitů vytvořeno: ${habitsWritten}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
