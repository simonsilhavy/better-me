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
import { RETRO_QUESTIONS } from '../lib/retro-questions';

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

const CHECK = [
  { value: 'ano', label: '✓ Splněno', tone: 'good' },
  { value: 'ne', label: '✗ Nesplněno', tone: 'bad' },
];

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
    key: 'cviceni',
    label: 'Cvičení',
    habits: [
      { key: 'kliky', label: 'Kliky', kind: 'counter', config: { min: 0, max: 250, step: 5 } },
      { key: 'drepy', label: 'Dřepy', kind: 'counter', config: { min: 0, max: 250, step: 5 } },
      { key: 'beh', label: 'Uběhnuto', kind: 'counter', config: { min: 0, max: 30, step: 0.1, unit: 'km' } },
    ],
  },
  {
    key: 'zdravi',
    label: 'Zdraví',
    habits: [
      {
        key: 'protahovani',
        label: 'Protahování',
        kind: 'choice',
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
        key: 'sprcha',
        label: 'Studená sprcha',
        kind: 'choice',
        config: {
          options: [
            { value: 'none', label: 'Žádná', tone: 'bad' },
            { value: 'partial', label: 'Částečná', tone: 'partial' },
            { value: 'full', label: 'Celá', tone: 'good' },
          ],
        },
      },
    ],
  },
  {
    key: 'strava',
    label: 'Strava',
    habits: [
      {
        key: 'shake',
        label: 'Protein shake',
        kind: 'choice',
        config: {
          options: [
            { value: '0', label: '0', tone: 'bad' },
            { value: '1', label: '1', tone: 'partial' },
            { value: '2', label: '2', tone: 'good' },
          ],
        },
      },
      { key: 'proteinOdpo', label: 'Odpolední protein', kind: 'choice', config: { clearable: true, options: CHECK } },
    ],
  },
  {
    key: 'principy',
    label: 'Principy',
    habits: [
      {
        key: 'instagram',
        label: 'Instagram',
        kind: 'choice',
        config: { hint: 'pravidlo drženo do 17:00', clearable: true, options: CHECK },
      },
      { key: 'resolveNow', label: 'Co otevřu, dořeším', kind: 'choice', config: { clearable: true, options: CHECK } },
    ],
  },
  {
    key: 'prace',
    label: 'Práce',
    habits: [
      { key: 'dpMinutes', label: 'Daňová Pohoda', kind: 'duration', config: { min: 0, max: 480, step: 15 } },
      { key: 'betterMe', label: 'BetterMe', kind: 'duration', config: { min: 0, max: 480, step: 15 } },
    ],
  },
  {
    key: 'retrospektiva',
    label: 'Retrospektiva',
    habits: [
      { key: 'retro', label: 'Retrospektiva', kind: 'retro', config: { maxLength: 4000, hideLabel: true, questions: RETRO_QUESTIONS } },
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
          options: [
            { value: 'win', label: 'Výhra', tone: 'good' },
            { value: 'loss', label: 'Prohra', tone: 'bad' },
          ],
        },
      },
      {
        key: 'note',
        label: 'Poznámka',
        kind: 'text',
        role: 'note',
        config: { maxLength: 4000, hideLabel: true, placeholder: 'Jaký máš z dneška pocit?' },
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
