import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { entries } from '@/db/schema';
import { type Entry, emptyEntry, rowToEntry } from './domain';

export async function getEntry(date: string): Promise<Entry | null> {
  const [row] = await db.select().from(entries).where(eq(entries.date, date)).limit(1);
  return row ? rowToEntry(row) : null;
}

/** Always returns a form-ready entry, even for a day that was never logged. */
export async function getEntryOrEmpty(date: string): Promise<Entry> {
  return (await getEntry(date)) ?? emptyEntry(date);
}

export async function getRange(from: string, to: string): Promise<Entry[]> {
  const rows = await db
    .select()
    .from(entries)
    .where(and(gte(entries.date, from), lte(entries.date, to)))
    .orderBy(asc(entries.date));
  return rows.map(rowToEntry);
}

export async function getAll(): Promise<Entry[]> {
  const rows = await db.select().from(entries).orderBy(desc(entries.date));
  return rows.map(rowToEntry);
}

export async function upsertEntry(entry: Entry): Promise<Entry> {
  const values = {
    date: entry.date,
    energyMorning: entry.energyMorning,
    energyUsed: entry.energyUsed,
    kliky: entry.kliky,
    drepy: entry.drepy,
    shake: entry.shake,
    sprcha: entry.sprcha,
    protahovani: entry.protahovani,
    dpMinutes: entry.dpMinutes,
    instagram: entry.instagram,
    resolveNow: entry.resolveNow,
    verdict: entry.verdict,
    note: entry.note,
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(entries)
    .values(values)
    .onConflictDoUpdate({ target: entries.date, set: values })
    .returning();

  return rowToEntry(row);
}

export type Stats = {
  wins: number;
  losses: number;
  logged: number;
  currentStreak: number;
  streakKind: 'win' | 'loss' | null;
  totalKliky: number;
  totalDrepy: number;
  totalDpMinutes: number;
};

export async function getStats(): Promise<Stats> {
  const [agg] = await db
    .select({
      wins: sql<number>`count(*) filter (where ${entries.verdict} = 'win')::int`,
      losses: sql<number>`count(*) filter (where ${entries.verdict} = 'loss')::int`,
      logged: sql<number>`count(*)::int`,
      totalKliky: sql<number>`coalesce(sum(${entries.kliky}), 0)::int`,
      totalDrepy: sql<number>`coalesce(sum(${entries.drepy}), 0)::int`,
      totalDpMinutes: sql<number>`coalesce(sum(${entries.dpMinutes}), 0)::int`,
    })
    .from(entries);

  // Streak = consecutive judged days from the most recent verdict backwards.
  const judged = await db
    .select({ verdict: entries.verdict })
    .from(entries)
    .where(sql`${entries.verdict} is not null`)
    .orderBy(desc(entries.date));

  let currentStreak = 0;
  let streakKind: 'win' | 'loss' | null = null;
  if (judged.length > 0) {
    streakKind = judged[0].verdict as 'win' | 'loss';
    for (const j of judged) {
      if (j.verdict !== streakKind) break;
      currentStreak++;
    }
  }

  return { ...agg, currentStreak, streakKind };
}
