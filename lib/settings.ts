import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { entryValues, habitGroups, habits } from '@/db/schema';
import { HABIT_KINDS, type HabitConfig, type HabitKind } from './domain';

/** Turns a label into a stable key. The key never changes afterwards. */
export function slugify(label: string): string {
  const base = label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'habit';
}

async function uniqueKey(base: string, taken: (k: string) => Promise<boolean>) {
  let key = base;
  let n = 2;
  while (await taken(key)) {
    key = `${base}-${n++}`;
  }
  return key;
}

const groupKeyTaken = async (key: string) =>
  (await db.select({ id: habitGroups.id }).from(habitGroups).where(eq(habitGroups.key, key)).limit(1))
    .length > 0;

const habitKeyTaken = async (key: string) =>
  (await db.select({ id: habits.id }).from(habits).where(eq(habits.key, key)).limit(1)).length > 0;

/* ------------------------------------------------------------------ oddíly */

export async function createGroup(label: string): Promise<void> {
  const clean = label.trim().slice(0, 60);
  if (!clean) throw new Error('Název oddílu nesmí být prázdný.');

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${habitGroups.position}), -1)::int` })
    .from(habitGroups);

  await db.insert(habitGroups).values({
    key: await uniqueKey(slugify(clean), groupKeyTaken),
    label: clean,
    position: max + 1,
  });
}

export async function renameGroup(id: number, label: string): Promise<void> {
  const clean = label.trim().slice(0, 60);
  if (!clean) throw new Error('Název oddílu nesmí být prázdný.');
  await db.update(habitGroups).set({ label: clean }).where(eq(habitGroups.id, id));
}

/**
 * Archiving a group that still holds habits would make them vanish from the
 * entry screen with no trace of where they went, so it is refused. The caller
 * moves them out first.
 */
export async function archiveGroup(id: number, archived: boolean): Promise<void> {
  if (archived) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(habits)
      .where(and(eq(habits.groupId, id), isNull(habits.archivedAt)));

    if (n > 0) {
      throw new Error(
        `Oddíl obsahuje ${n} aktivních habitů. Nejdřív je přesuň jinam.`,
      );
    }
  }

  await db
    .update(habitGroups)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(habitGroups.id, id));
}

export async function moveGroup(id: number, direction: -1 | 1): Promise<void> {
  const rows = await db
    .select({ id: habitGroups.id })
    .from(habitGroups)
    .where(isNull(habitGroups.archivedAt))
    .orderBy(asc(habitGroups.position), asc(habitGroups.id));

  const index = rows.findIndex((r) => r.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= rows.length) return;

  const reordered = [...rows];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  // Renumber the whole list rather than swapping two values, so positions
  // stay dense and a half-applied earlier edit can't leave duplicates.
  for (const [i, row] of reordered.entries()) {
    await db.update(habitGroups).set({ position: i }).where(eq(habitGroups.id, row.id));
  }
}

/* ------------------------------------------------------------------ habity */

export type NewHabit = {
  label: string;
  kind: HabitKind;
  groupId: number | null;
  config: HabitConfig;
};

export async function createHabit(input: NewHabit): Promise<void> {
  const label = input.label.trim().slice(0, 60);
  if (!label) throw new Error('Název habitu nesmí být prázdný.');
  if (!(HABIT_KINDS as readonly string[]).includes(input.kind)) {
    throw new Error('Neznámý typ habitu.');
  }

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${habits.position}), -1)::int` })
    .from(habits)
    .where(input.groupId === null ? isNull(habits.groupId) : eq(habits.groupId, input.groupId));

  await db.insert(habits).values({
    groupId: input.groupId,
    key: await uniqueKey(slugify(label), habitKeyTaken),
    label,
    kind: input.kind,
    config: input.config,
    position: max + 1,
  });
}

export async function renameHabit(id: number, label: string): Promise<void> {
  const clean = label.trim().slice(0, 60);
  if (!clean) throw new Error('Název habitu nesmí být prázdný.');
  // Only the label moves; `key` is what the API speaks and stays put.
  await db.update(habits).set({ label: clean }).where(eq(habits.id, id));
}

export async function archiveHabit(id: number, archived: boolean): Promise<void> {
  await db
    .update(habits)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(habits.id, id));
}

/**
 * Moving a habit between groups rewrites one field. Recorded values reference
 * the habit, not its group, so none of them are read or written here.
 */
export async function moveHabitToGroup(id: number, groupId: number | null): Promise<void> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${habits.position}), -1)::int` })
    .from(habits)
    .where(groupId === null ? isNull(habits.groupId) : eq(habits.groupId, groupId));

  await db.update(habits).set({ groupId, position: max + 1 }).where(eq(habits.id, id));
}

export async function moveHabit(id: number, direction: -1 | 1): Promise<void> {
  const [habit] = await db.select().from(habits).where(eq(habits.id, id)).limit(1);
  if (!habit) return;

  const siblings = await db
    .select({ id: habits.id })
    .from(habits)
    .where(
      and(
        habit.groupId === null ? isNull(habits.groupId) : eq(habits.groupId, habit.groupId),
        isNull(habits.archivedAt),
      ),
    )
    .orderBy(asc(habits.position), asc(habits.id));

  const index = siblings.findIndex((r) => r.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= siblings.length) return;

  const reordered = [...siblings];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  for (const [i, row] of reordered.entries()) {
    await db.update(habits).set({ position: i }).where(eq(habits.id, row.id));
  }
}

/** How much history a habit is holding — the number a delete has to name. */
export async function countHabitValues(id: number): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(entryValues)
    .where(eq(entryValues.habitId, id));
  return n;
}

/**
 * Deletes a habit and everything it recorded. The database refuses this while
 * values exist, so they are removed first — deliberately, in one place, behind
 * a confirmation that has already named the cost.
 */
export async function deleteHabit(id: number): Promise<void> {
  await db.delete(entryValues).where(eq(entryValues.habitId, id));
  await db.delete(habits).where(eq(habits.id, id));
}

/** At most one habit may carry a given role. */
export async function setHabitRole(id: number, role: 'verdict' | 'note' | null): Promise<void> {
  if (role !== null) {
    await db.update(habits).set({ role: null }).where(and(eq(habits.role, role), ne(habits.id, id)));
  }
  await db.update(habits).set({ role }).where(eq(habits.id, id));
}
