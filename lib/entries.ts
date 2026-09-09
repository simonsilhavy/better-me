import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { entries, entryValues, habitGroups, habits } from '@/db/schema';
import {
  type DayEntry,
  type Habit,
  type HabitGroup,
  type HabitValue,
  coerceValue,
  columnsToValue,
  defaultValue,
  emptyDay,
  isRecorded,
  rowToGroup,
  rowToHabit,
  valueToColumns,
} from './domain';

/* ---------------------------------------------------------------- definice */

export async function getGroups(includeArchived = false): Promise<HabitGroup[]> {
  const rows = await db
    .select()
    .from(habitGroups)
    .where(includeArchived ? undefined : isNull(habitGroups.archivedAt))
    .orderBy(asc(habitGroups.position), asc(habitGroups.id));
  return rows.map(rowToGroup);
}

export async function getHabits(includeArchived = false): Promise<Habit[]> {
  const rows = await db
    .select()
    .from(habits)
    .where(includeArchived ? undefined : isNull(habits.archivedAt))
    .orderBy(asc(habits.position), asc(habits.id));
  return rows.map(rowToHabit);
}

/** Every habit, archived ones included — history has to name them too. */
export async function getHabitsByKey(): Promise<Map<string, Habit>> {
  const all = await getHabits(true);
  return new Map(all.map((h) => [h.key, h]));
}

export async function getHabitsById(): Promise<Map<number, Habit>> {
  const all = await getHabits(true);
  return new Map(all.map((h) => [h.id, h]));
}

/* ------------------------------------------------------------------ záznamy */

function buildDay(
  date: string,
  rows: { habitId: number; num: number | null; txt: string | null; flag: boolean | null }[],
  byId: Map<number, Habit>,
  updatedAt: Date | null,
): DayEntry {
  const values: Record<string, HabitValue> = {};
  for (const row of rows) {
    const habit = byId.get(row.habitId);
    if (!habit) continue; // habit smazán — hodnota se prostě nezobrazí
    values[habit.key] = columnsToValue(habit, row);
  }
  return { date, values, updatedAt: updatedAt ? updatedAt.toISOString() : null };
}

export async function getDay(date: string): Promise<DayEntry> {
  const byId = await getHabitsById();

  const [[entry], rows] = await Promise.all([
    db.select().from(entries).where(eq(entries.date, date)).limit(1),
    db
      .select({
        habitId: entryValues.habitId,
        num: entryValues.num,
        txt: entryValues.txt,
        flag: entryValues.flag,
      })
      .from(entryValues)
      .where(eq(entryValues.date, date)),
  ]);

  if (!entry && rows.length === 0) return emptyDay(date);
  return buildDay(date, rows, byId, entry?.updatedAt ?? null);
}

export async function getRange(from: string, to: string): Promise<DayEntry[]> {
  const byId = await getHabitsById();

  const rows = await db
    .select({
      date: entryValues.date,
      habitId: entryValues.habitId,
      num: entryValues.num,
      txt: entryValues.txt,
      flag: entryValues.flag,
    })
    .from(entryValues)
    .where(and(gte(entryValues.date, from), lte(entryValues.date, to)))
    .orderBy(asc(entryValues.date));

  const days = await db
    .select()
    .from(entries)
    .where(and(gte(entries.date, from), lte(entries.date, to)))
    .orderBy(asc(entries.date));

  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = grouped.get(row.date) ?? [];
    list.push(row);
    grouped.set(row.date, list);
  }

  return days.map((d) => buildDay(d.date, grouped.get(d.date) ?? [], byId, d.updatedAt));
}

export async function getAllDays(): Promise<DayEntry[]> {
  const [first] = await db
    .select({ date: entries.date })
    .from(entries)
    .orderBy(asc(entries.date))
    .limit(1);
  if (!first) return [];

  const [last] = await db
    .select({ date: entries.date })
    .from(entries)
    .orderBy(desc(entries.date))
    .limit(1);

  const days = await getRange(first.date, last!.date);
  return days.reverse();
}

/**
 * The wire shape: every active habit present, recorded or not.
 *
 * Only non-default values get stored, so a raw day would omit whatever you left
 * alone. Filling the gaps back in keeps the response stable for callers — the
 * chat relay reads a day, edits a field and writes it back, and a key that
 * silently vanishes would drop the rest of the day with it.
 */
export function toApiShape(day: DayEntry, active: Habit[]): Record<string, unknown> {
  const out: Record<string, unknown> = { date: day.date };
  for (const habit of active) {
    out[habit.key] = day.values[habit.key] ?? defaultValue(habit);
  }
  out.updatedAt = day.updatedAt;
  return out;
}

/** Shapes a whole range with one habit lookup rather than one per day. */
export async function toApiShapes(days: DayEntry[]): Promise<Record<string, unknown>[]> {
  const active = await getHabits();
  return days.map((d) => toApiShape(d, active));
}

export type DaySummary = { date: string; filled: number; verdict: string | null };

/**
 * One row per logged day with just what a list needs: how much was filled in,
 * and the verdict. Materialising every value to count them meant pulling a
 * year of rows over the wire to render a list of dates.
 */
export async function getDaySummaries(): Promise<DaySummary[]> {
  const rows = await db
    .select({
      date: entries.date,
      filled: sql<number>`count(${entryValues.habitId}) filter (where ${habits.archivedAt} is null)::int`,
      verdict: sql<string | null>`max(case when ${habits.role} = 'verdict' then ${entryValues.txt} end)`,
    })
    .from(entries)
    .leftJoin(entryValues, eq(entryValues.date, entries.date))
    .leftJoin(habits, eq(habits.id, entryValues.habitId))
    .groupBy(entries.date)
    .orderBy(desc(entries.date));

  return rows.map((r) => ({ date: r.date, filled: r.filled, verdict: r.verdict }));
}

/** The first day ever logged, for an "all time" period. */
export async function getEarliestDate(): Promise<string | null> {
  const [row] = await db
    .select({ date: entries.date })
    .from(entries)
    .orderBy(asc(entries.date))
    .limit(1);
  return row?.date ?? null;
}

export type SaveOutcome = { saved: string[]; ignored: string[] };

/**
 * Writes a day. Keys that match no habit are reported back rather than dropped
 * in silence, so a typo in an API call is visible instead of looking like a
 * successful write that quietly did nothing.
 */
export async function upsertDay(
  date: string,
  input: Record<string, unknown>,
): Promise<SaveOutcome> {
  const byKey = await getHabitsByKey();

  const saved: string[] = [];
  const ignored: string[] = [];
  const toWrite: { habitId: number; num: number | null; txt: string | null; flag: boolean | null }[] = [];
  const toClear: number[] = [];

  for (const [key, raw] of Object.entries(input)) {
    const habit = byKey.get(key);
    if (!habit) {
      ignored.push(key);
      continue;
    }

    const value = coerceValue(habit, raw);
    saved.push(key);

    if (isRecorded(habit, value)) {
      toWrite.push({ habitId: habit.id, ...valueToColumns(habit, value) });
    } else {
      // Back to the default: drop the row so "filled in" stays meaningful.
      toClear.push(habit.id);
    }
  }

  await db
    .insert(entries)
    .values({ date, updatedAt: new Date() })
    .onConflictDoUpdate({ target: entries.date, set: { updatedAt: new Date() } });

  if (toWrite.length > 0) {
    await db
      .insert(entryValues)
      .values(toWrite.map((v) => ({ date, ...v })))
      .onConflictDoUpdate({
        target: [entryValues.date, entryValues.habitId],
        set: {
          num: sql`excluded.num`,
          txt: sql`excluded.txt`,
          flag: sql`excluded.flag`,
        },
      });
  }

  if (toClear.length > 0) {
    await db
      .delete(entryValues)
      .where(and(eq(entryValues.date, date), inArray(entryValues.habitId, toClear)));
  }

  return { saved, ignored };
}

/* --------------------------------------------------------------- statistiky */

export type Stats = {
  /** Absent when no habit carries the verdict role — the screen degrades. */
  verdict: { habit: Habit; wins: number; losses: number; streak: number; streakKind: string | null } | null;
  loggedDays: number;
};

export async function getStats(): Promise<Stats> {
  const all = await getHabits(true);
  const verdictHabit = all.find((h) => h.role === 'verdict') ?? null;

  const [{ n: loggedDays }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(entries);

  if (!verdictHabit) return { verdict: null, loggedDays };

  const options = verdictHabit.config.options ?? [];
  const winValue = options[0]?.value ?? 'win';
  const lossValue = options[1]?.value ?? 'loss';

  const judged = await db
    .select({ date: entryValues.date, txt: entryValues.txt })
    .from(entryValues)
    .where(eq(entryValues.habitId, verdictHabit.id))
    .orderBy(desc(entryValues.date));

  let wins = 0;
  let losses = 0;
  for (const row of judged) {
    if (row.txt === winValue) wins++;
    else if (row.txt === lossValue) losses++;
  }

  let streak = 0;
  let streakKind: string | null = null;
  if (judged.length > 0) {
    streakKind = judged[0].txt;
    for (const row of judged) {
      if (row.txt !== streakKind) break;
      streak++;
    }
  }

  return {
    verdict: { habit: verdictHabit, wins, losses, streak, streakKind },
    loggedDays,
  };
}
