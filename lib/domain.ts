import type { HabitGroupRow, HabitRow } from '@/db/schema';

export const HABIT_KINDS = [
  'scale',
  'counter',
  'duration',
  'choice',
  'boolean',
  'text',
] as const;

export type HabitKind = (typeof HABIT_KINDS)[number];
export type HabitRole = 'verdict' | 'note';

/**
 * `tone` says what the choice means, not what colour to paint: done, partly
 * done, or not done. The control turns that into a colour, so a habit created
 * later can carry the same meaning without hard-coding its palette.
 */
export type ChoiceTone = 'good' | 'partial' | 'bad';

export type ChoiceOption = { value: string; label: string; tone?: ChoiceTone };

export type HabitConfig = {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: ChoiceOption[];
  /** A clearable choice can be tapped again to unset it. */
  clearable?: boolean;
  maxLength?: number;
  placeholder?: string;
  hint?: string;
};

export type Habit = {
  id: number;
  groupId: number | null;
  key: string;
  label: string;
  kind: HabitKind;
  config: HabitConfig;
  role: HabitRole | null;
  position: number;
  archived: boolean;
};

export type HabitGroup = {
  id: number;
  key: string;
  label: string;
  position: number;
  archived: boolean;
};

/** What a single habit holds on a single day. */
export type HabitValue = number | string | boolean | null;

export type DayEntry = {
  date: string;
  /** Keyed by habit key, so the API and the form speak the same language. */
  values: Record<string, HabitValue>;
  updatedAt: string | null;
};

/** Columns of entry_values; exactly one is ever non-null. */
export type ValueColumns = {
  num: number | null;
  txt: string | null;
  flag: boolean | null;
};

const isKind = (v: unknown): v is HabitKind =>
  (HABIT_KINDS as readonly string[]).includes(String(v));

export function rowToHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    groupId: row.groupId,
    key: row.key,
    label: row.label,
    kind: isKind(row.kind) ? row.kind : 'counter',
    config: (row.config ?? {}) as HabitConfig,
    role: row.role === 'verdict' || row.role === 'note' ? row.role : null,
    position: row.position,
    archived: row.archivedAt !== null,
  };
}

export function rowToGroup(row: HabitGroupRow): HabitGroup {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    position: row.position,
    archived: row.archivedAt !== null,
  };
}

/** The value a habit holds on a day nothing was recorded. */
export function defaultValue(habit: Habit): HabitValue {
  switch (habit.kind) {
    case 'scale':
    case 'counter':
    case 'duration':
      return habit.config.min ?? 0;
    case 'boolean':
      return false;
    case 'choice':
      return habit.config.clearable
        ? null
        : (habit.config.options?.[0]?.value ?? null);
    case 'text':
      return '';
  }
}

/**
 * Coerces anything — an API body, a seed file, a form post — into a value this
 * habit can actually hold. Numbers are clamped and snapped to the habit's step,
 * unknown choices fall back to the default. A malformed payload can shorten a
 * day's record but can never write nonsense into it.
 */
export function coerceValue(habit: Habit, raw: unknown): HabitValue {
  const cfg = habit.config;

  switch (habit.kind) {
    case 'scale':
    case 'counter':
    case 'duration': {
      const min = cfg.min ?? 0;
      const max = cfg.max ?? 1000;
      const step = cfg.step && cfg.step > 0 ? cfg.step : 1;
      const n = Number(raw);
      if (!Number.isFinite(n)) return min;
      const snapped = Math.round((n - min) / step) * step + min;
      return Math.min(max, Math.max(min, snapped));
    }

    case 'boolean':
      if (typeof raw === 'boolean') return raw;
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return false;

    case 'choice': {
      const allowed = (cfg.options ?? []).map((o) => o.value);
      const v = String(raw);
      if (allowed.includes(v)) return v;
      return defaultValue(habit);
    }

    case 'text': {
      if (typeof raw !== 'string') return '';
      return raw.slice(0, cfg.maxLength ?? 4000);
    }
  }
}

/** Splits a value into the three storage columns. */
export function valueToColumns(habit: Habit, value: HabitValue): ValueColumns {
  const empty: ValueColumns = { num: null, txt: null, flag: null };

  switch (habit.kind) {
    case 'scale':
    case 'counter':
    case 'duration':
      return { ...empty, num: typeof value === 'number' ? value : null };
    case 'boolean':
      return { ...empty, flag: typeof value === 'boolean' ? value : null };
    case 'choice':
    case 'text':
      return { ...empty, txt: typeof value === 'string' ? value : null };
  }
}

export function columnsToValue(habit: Habit, cols: ValueColumns): HabitValue {
  switch (habit.kind) {
    case 'scale':
    case 'counter':
    case 'duration':
      return cols.num ?? defaultValue(habit);
    case 'boolean':
      return cols.flag ?? false;
    case 'choice':
      return cols.txt ?? defaultValue(habit);
    case 'text':
      return cols.txt ?? '';
  }
}

/**
 * Whether a value is worth a row. Storing only what differs from the default
 * keeps "how much of today did I actually fill in" answerable — a habit with no
 * row is one you skipped, not one you deliberately recorded as zero.
 */
export function isRecorded(habit: Habit, value: HabitValue): boolean {
  const def = defaultValue(habit);
  if (habit.kind === 'text') return typeof value === 'string' && value.trim() !== '';
  return value !== def && value !== null;
}

export function emptyDay(date: string): DayEntry {
  return { date, values: {}, updatedAt: null };
}

/** The value to show in the form: what was recorded, else the habit's default. */
export function valueFor(entry: DayEntry, habit: Habit): HabitValue {
  const v = entry.values[habit.key];
  return v === undefined ? defaultValue(habit) : v;
}
