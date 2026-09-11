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

/** The hour the day's question uncovers itself, in the app's timezone. */
export const REVEAL_HOUR = 20;

/** Where a scratched-open day is remembered; per device, like a folded group. */
export const revealKey = (date: string) => `bm-retro-revealed-${date}`;

/**
 * Should the day's question still be hidden?
 *
 * Knowing the prompt in the morning lets you arrange the day around having a
 * good answer to it — which is the same distortion as chasing a win, only
 * quieter. So it stays covered until the evening, and the reader can always
 * uncover it early on purpose.
 *
 * Past days are never covered: the day is over, there is nothing left to
 * stage. An answered day is never covered either — you cannot un-know what
 * you already wrote.
 */
export function isCovered(input: {
  date: string;
  todayDate: string;
  hasAnswer: boolean;
  uncoveredByHand: boolean;
  hour: number;
}): boolean {
  if (input.hasAnswer) return false;
  if (input.uncoveredByHand) return false;
  if (input.date < input.todayDate) return false;
  // Today after the hour opens by itself; a future day never does.
  if (input.date === input.todayDate && input.hour >= REVEAL_HOUR) return false;
  return true;
}
