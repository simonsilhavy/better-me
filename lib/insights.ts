import { gte, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { entryValues, habits } from '@/db/schema';
import { type Habit, columnsToValue, hasActivity, rowToHabit } from './domain';
import { addDays, today } from './date';

/**
 * Below this many days on either side, a difference is noise dressed up as a
 * finding. The view says "málo dat" instead of showing a number nobody should
 * act on.
 */
export const MIN_GROUP_DAYS = 10;

/** Nothing here means anything until there is a month or so to look at. */
export const MIN_TOTAL_DAYS = 30;

export type WeekdayStat = {
  /** 0 = Monday. */
  weekday: number;
  loggedDays: number;
  wins: number;
  losses: number;
  /** Share of judged days that were wins, or null when none were judged. */
  winRate: number | null;
};

export type Driver = {
  habit: Habit;
  /** Win rate on days the habit showed activity. */
  withRate: number;
  /** Win rate on days it did not. */
  withoutRate: number;
  /** Difference in percentage points; positive means "more wins alongside". */
  points: number;
  daysWith: number;
  daysWithout: number;
  /** True when either side is too thin to say anything. */
  thin: boolean;
};

type DayRow = { date: string; verdict: string | null; values: Map<number, unknown> };

/**
 * Everything needed by both views, in one pass.
 *
 * The verdict habit is removable, so both views have to cope with there being
 * no verdict at all — they then fall back to counting what was written down,
 * which is the question the data can still answer.
 */
async function loadDays(fromDate: string) {
  const rows = await db
    .select()
    .from(habits)
    .where(isNull(habits.archivedAt))
    .orderBy(habits.position, habits.id);
  const all = rows.map(rowToHabit);
  const verdictHabit = all.find((h) => h.role === 'verdict') ?? null;

  const options = verdictHabit?.config.options ?? [];
  const winValue = options[0]?.value ?? null;
  const lossValue = options[1]?.value ?? null;

  const raw = await db
    .select({
      date: entryValues.date,
      habitId: entryValues.habitId,
      num: entryValues.num,
      txt: entryValues.txt,
      flag: entryValues.flag,
      meta: entryValues.meta,
    })
    .from(entryValues)
    .where(gte(entryValues.date, fromDate));

  const byDate = new Map<string, DayRow>();
  const byId = new Map(all.map((h) => [h.id, h]));

  for (const r of raw) {
    let day = byDate.get(r.date);
    if (!day) {
      day = { date: r.date, verdict: null, values: new Map() };
      byDate.set(r.date, day);
    }
    const habit = byId.get(r.habitId);
    if (!habit) continue;
    day.values.set(r.habitId, columnsToValue(habit, r));
    if (verdictHabit && r.habitId === verdictHabit.id) day.verdict = r.txt;
  }

  return { all, verdictHabit, winValue, lossValue, days: [...byDate.values()] };
}

function weekdayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Written-down days and how they turned out, grouped by day of the week. */
export async function getWeekdayStats(windowDays = 90): Promise<{
  stats: WeekdayStat[];
  hasVerdict: boolean;
  totalDays: number;
}> {
  const from = addDays(today(), -windowDays);
  const { verdictHabit, winValue, lossValue, days } = await loadDays(from);

  const stats: WeekdayStat[] = Array.from({ length: 7 }, (_, i) => ({
    weekday: i,
    loggedDays: 0,
    wins: 0,
    losses: 0,
    winRate: null,
  }));

  for (const day of days) {
    if (day.values.size === 0) continue;
    const s = stats[weekdayIndex(day.date)];
    s.loggedDays++;
    if (day.verdict === winValue) s.wins++;
    else if (day.verdict === lossValue) s.losses++;
  }

  for (const s of stats) {
    const judged = s.wins + s.losses;
    s.winRate = judged === 0 ? null : (s.wins / judged) * 100;
  }

  return {
    stats,
    hasVerdict: Boolean(verdictHabit),
    totalDays: days.filter((d) => d.values.size > 0).length,
  };
}

/**
 * For each habit, the win rate on days it saw activity against days it did not.
 *
 * This is a correlation and nothing more: it says two things move together, not
 * that one causes the other. Both the wording in the view and the MIN_GROUP_DAYS
 * floor exist to keep it from reading as advice.
 */
export async function getDrivers(windowDays = 90): Promise<{
  drivers: Driver[];
  hasVerdict: boolean;
  judgedDays: number;
}> {
  const from = addDays(today(), -windowDays);
  const { all, verdictHabit, winValue, lossValue, days } = await loadDays(from);

  if (!verdictHabit) return { drivers: [], hasVerdict: false, judgedDays: 0 };

  // Only days carrying a verdict can say anything about wins.
  const judged = days.filter((d) => d.verdict === winValue || d.verdict === lossValue);

  const drivers: Driver[] = [];
  for (const habit of all) {
    if (habit.id === verdictHabit.id || habit.role === 'note') continue;
    if (habit.kind === 'text' || habit.kind === 'retro') continue;

    let winsWith = 0;
    let daysWith = 0;
    let winsWithout = 0;
    let daysWithout = 0;

    for (const day of judged) {
      // A habit with nothing recorded that day is not a claim either way, so
      // it stays out of both groups rather than counting as "didn't do it".
      if (!day.values.has(habit.id)) continue;
      const active = hasActivity(habit, day.values.get(habit.id) as never);
      const win = day.verdict === winValue;
      if (active) {
        daysWith++;
        if (win) winsWith++;
      } else {
        daysWithout++;
        if (win) winsWithout++;
      }
    }

    if (daysWith === 0 && daysWithout === 0) continue;

    const withRate = daysWith === 0 ? 0 : (winsWith / daysWith) * 100;
    const withoutRate = daysWithout === 0 ? 0 : (winsWithout / daysWithout) * 100;
    const thin = daysWith < MIN_GROUP_DAYS || daysWithout < MIN_GROUP_DAYS;

    drivers.push({
      habit,
      withRate,
      withoutRate,
      points: withRate - withoutRate,
      daysWith,
      daysWithout,
      thin,
    });
  }

  // Solid findings first, biggest difference at the top; thin ones stay at the
  // bottom so the eye lands on what is actually supported.
  drivers.sort((a, b) => {
    if (a.thin !== b.thin) return a.thin ? 1 : -1;
    return Math.abs(b.points) - Math.abs(a.points);
  });

  return { drivers, hasVerdict: true, judgedDays: judged.length };
}

/** How many days carry anything at all — gates whether the views are shown. */
export async function countLoggedDays(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(distinct ${entryValues.date})::int` })
    .from(entryValues);
  return row?.n ?? 0;
}
