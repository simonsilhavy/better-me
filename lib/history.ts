import type { DayEntry, Habit, HabitValue } from './domain';
import { defaultValue, isRecorded } from './domain';
import { addDays, daysBetween } from './date';

export type Metric = 'sum' | 'avg' | 'days';

export type HabitPeriodStats = {
  habit: Habit;
  metric: Metric;
  value: number;
  previous: number;
  /** Null when the previous period holds nothing to compare against. */
  changePct: number | null;
  recordedDays: number;
  spark: number[];
};

/**
 * Counters and durations add up; a percentage only means anything averaged over
 * the days it was recorded. Choices and switches have no scale at all, so what
 * is worth counting there is how many days you recorded them.
 */
export function metricFor(habit: Habit): Metric {
  switch (habit.kind) {
    case 'counter':
    case 'duration':
      return 'sum';
    case 'scale':
      return 'avg';
    default:
      return 'days';
  }
}

function numeric(habit: Habit, value: HabitValue | undefined): number | null {
  if (value === undefined) return null;
  if (typeof value === 'number') return value;
  return null;
}

function aggregate(habit: Habit, days: DayEntry[], metric: Metric): { value: number; recorded: number } {
  let sum = 0;
  let recorded = 0;

  for (const day of days) {
    const raw = day.values[habit.key];
    if (raw === undefined || !isRecorded(habit, raw)) continue;
    recorded++;
    const n = numeric(habit, raw);
    if (n !== null) sum += n;
  }

  if (metric === 'sum') return { value: sum, recorded };
  if (metric === 'avg') return { value: recorded > 0 ? sum / recorded : 0, recorded };
  return { value: recorded, recorded };
}

/**
 * Per-habit figures for a window, next to the window of equal length before it.
 * Comparing like-for-like lengths is what makes the change percentage mean
 * anything when you switch from 7 days to 90.
 */
export function periodStats(
  habits: Habit[],
  current: DayEntry[],
  previous: DayEntry[],
  dates: string[],
): HabitPeriodStats[] {
  const byDate = new Map(current.map((d) => [d.date, d]));

  return habits.map((habit) => {
    const metric = metricFor(habit);
    const now = aggregate(habit, current, metric);
    const before = aggregate(habit, previous, metric);

    const changePct =
      before.value === 0 ? null : ((now.value - before.value) / before.value) * 100;

    const spark = dates.map((d) => {
      const raw = byDate.get(d)?.values[habit.key];
      if (raw === undefined || !isRecorded(habit, raw)) return 0;
      const n = numeric(habit, raw);
      return n ?? 1;
    });

    return {
      habit,
      metric,
      value: now.value,
      previous: before.value,
      changePct,
      recordedDays: now.recorded,
      spark,
    };
  });
}

/** The window of the same length immediately before [from, to]. */
export function previousWindow(from: string, to: string): { from: string; to: string } {
  const length = daysBetween(from, to) + 1;
  return { from: addDays(from, -length), to: addDays(to, -length) };
}

export function formatValue(stats: HabitPeriodStats): string {
  const { habit, metric, value } = stats;
  const unit = habit.config.unit ? ` ${habit.config.unit}` : '';

  if (habit.kind === 'duration') {
    const total = Math.round(value);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
  if (metric === 'avg') return `${Math.round(value)}${unit || ' %'}`;
  if (metric === 'days') return `${value}×`;
  return `${Math.round(value)}${unit}`;
}

/** Whether a day counts as logged at all, for the calendar and completeness. */
export function dayIsLogged(day: DayEntry | undefined, habits: Habit[]): boolean {
  if (!day) return false;
  return habits.some((h) => {
    const v = day.values[h.key];
    return v !== undefined && isRecorded(h, v) && v !== defaultValue(h);
  });
}
