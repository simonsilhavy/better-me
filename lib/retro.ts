import type { Habit, RetroQuestion, RetroValue } from './domain';
import { isRetroValue } from './domain';
import { daysBetween } from './date';

/**
 * The question for a given day.
 *
 * Deterministic, so opening the app ten times shows the same prompt and a
 * half-written answer never loses the question underneath it. Once an answer
 * has been saved, the question stored with it wins — that is what keeps old
 * days honest after the set grows.
 */
export function questionForDate(habit: Habit, date: string): RetroQuestion | null {
  const questions = habit.config.questions ?? [];
  if (questions.length === 0) return null;

  const index = Math.abs(daysBetween('2026-01-01', date)) % questions.length;
  return questions[index];
}

export function questionFor(
  habit: Habit,
  date: string,
  value: RetroValue | null,
): RetroQuestion | null {
  const questions = habit.config.questions ?? [];
  const pinned = value?.q ? questions.find((q) => q.id === value.q) : undefined;
  return pinned ?? questionForDate(habit, date);
}

export function retroValue(value: unknown): RetroValue {
  return isRetroValue(value as never) ? (value as RetroValue) : { q: '', a: '' };
}
