import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { entryValues, habits } from '@/db/schema';
import { type Habit, rowToHabit } from './domain';

/** One thing written down on one day, with the prompt it answered. */
export type DiaryNote = {
  date: string;
  habit: Habit;
  text: string;
  /** The retrospective prompt this answered, when there was one. */
  question: string | null;
  /** Id of that prompt — what the question filter matches on. */
  questionId: string | null;
};

export type DiaryFilter = {
  /** Restrict to answers to one retrospective question, by its id. */
  questionId?: string;
  /** Case-insensitive substring of the written text. */
  search?: string;
  limit?: number;
};

/** The habits whose values are prose worth reading back. */
export async function getWritingHabits(): Promise<Habit[]> {
  const rows = await db
    .select()
    .from(habits)
    .where(inArray(habits.kind, ['text', 'retro']))
    .orderBy(habits.position, habits.id);
  return rows.map(rowToHabit);
}

/**
 * Everything ever written, newest first.
 *
 * Notes and retrospective answers were write-only until now: the app asked a
 * question every evening and then had nowhere to show the answers. Because
 * every retro answer stores the id of the question it answered, filtering by
 * question is a plain equality check — the same prompt across months lines up
 * even after its wording changes.
 */
export async function getDiary(filter: DiaryFilter = {}): Promise<DiaryNote[]> {
  const writing = await getWritingHabits();
  if (writing.length === 0) return [];

  const byId = new Map(writing.map((h) => [h.id, h]));

  const conditions = [
    inArray(entryValues.habitId, writing.map((h) => h.id)),
    sql`${entryValues.txt} is not null and btrim(${entryValues.txt}) <> ''`,
  ];
  if (filter.questionId) {
    conditions.push(eq(sql`${entryValues.meta}->>'q'`, filter.questionId));
  }
  if (filter.search && filter.search.trim() !== '') {
    conditions.push(ilike(entryValues.txt, `%${filter.search.trim()}%`));
  }

  const rows = await db
    .select({
      date: entryValues.date,
      habitId: entryValues.habitId,
      txt: entryValues.txt,
      meta: entryValues.meta,
    })
    .from(entryValues)
    .where(and(...conditions))
    .orderBy(desc(entryValues.date), entryValues.habitId)
    .limit(filter.limit ?? 100);

  const notes: DiaryNote[] = [];
  for (const row of rows) {
    const habit = byId.get(row.habitId);
    if (!habit || row.txt === null) continue;

    const questionId =
      row.meta && typeof row.meta === 'object' && 'q' in row.meta
        ? String((row.meta as { q?: unknown }).q ?? '') || null
        : null;

    // The stored id wins over the habit's current wording only in *which*
    // prompt it points at; the text shown is always today's wording, so a
    // fixed typo reads correctly in old entries too.
    const question =
      questionId !== null
        ? ((habit.config.questions ?? []).find((q) => q.id === questionId)?.text ?? null)
        : null;

    notes.push({ date: row.date, habit, text: row.txt, question, questionId });
  }
  return notes;
}

/** Which questions actually have answers, so the filter only offers real ones. */
export async function getAnsweredQuestions(): Promise<{ id: string; text: string; count: number }[]> {
  const writing = await getWritingHabits();
  const retro = writing.filter((h) => h.kind === 'retro');
  if (retro.length === 0) return [];

  const rows = await db
    .select({
      q: sql<string>`${entryValues.meta}->>'q'`,
      n: sql<number>`count(*)::int`,
    })
    .from(entryValues)
    .where(
      and(
        inArray(entryValues.habitId, retro.map((h) => h.id)),
        sql`${entryValues.meta}->>'q' is not null and ${entryValues.meta}->>'q' <> ''`,
        sql`${entryValues.txt} is not null and btrim(${entryValues.txt}) <> ''`,
      ),
    )
    .groupBy(sql`${entryValues.meta}->>'q'`);

  const texts = new Map<string, string>();
  for (const h of retro) {
    for (const q of h.config.questions ?? []) texts.set(q.id, q.text);
  }

  return rows
    .map((r) => ({ id: r.q, text: texts.get(r.q) ?? r.q, count: r.n }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, 'cs'));
}
