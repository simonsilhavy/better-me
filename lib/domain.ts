import type { HabitGroupRow, HabitRow } from '@/db/schema';

export const HABIT_KINDS = [
  'scale',
  'counter',
  'duration',
  'choice',
  'boolean',
  'text',
  'retro',
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

/** One prompt in a retrospective habit's set. Ids are stable; text can change. */
export type RetroQuestion = { id: string; text: string };

/**
 * A retrospective answer travels with the question it answers. Deriving the
 * question from the date instead would look identical today and silently
 * reassign every old answer the first time the set grows.
 */
export type RetroValue = { q: string; a: string };

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
  /** The placeholder carries the prompt, so a label would only repeat it. */
  hideLabel?: boolean;
  questions?: RetroQuestion[];
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

/** Presentation settings a group carries; everything here is optional. */
export type GroupConfig = {
  /** Shown as a small flourish when the group is completed with any activity. */
  emoji?: string;
};

export type HabitGroup = {
  id: number;
  key: string;
  label: string;
  position: number;
  config: GroupConfig;
  archived: boolean;
};

/** What a single habit holds on a single day. */
export type HabitValue = number | string | boolean | RetroValue | null;

export function isRetroValue(v: HabitValue): v is RetroValue {
  return typeof v === 'object' && v !== null && 'a' in v;
}

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
  meta?: unknown;
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
    config: (row.config ?? {}) as GroupConfig,
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
    case 'retro':
      return { q: '', a: '' };
  }
}

/**
 * Coerces anything — an API body, a seed file, a form post — into a value this
 * habit can actually hold. Numbers are clamped and snapped to the habit's step,
 * unknown choices fall back to the default. A malformed payload can shorten a
 * day's record but can never write nonsense into it.
 */
/**
 * Snapping to a fractional step leaves binary-float debris -- 3 * 0.1 is
 * 0.30000000000000004 -- which would otherwise be stored and shown verbatim.
 * Rounding to the step's own precision keeps 2.9 km reading as 2.9 km.
 */
function roundToStep(value: number, step: number): number {
  const s = String(step);
  const dot = s.indexOf('.');
  const decimals = dot === -1 || s.includes('e') ? 0 : s.length - dot - 1;
  return decimals === 0 ? value : Number(value.toFixed(decimals));
}

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
      return roundToStep(Math.min(max, Math.max(min, snapped)), step);
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

    case 'retro': {
      // A bare string is accepted as the answer alone, so the chat relay can
      // write one without knowing which question was drawn.
      if (typeof raw === 'string') return { q: '', a: raw.slice(0, cfg.maxLength ?? 4000) };
      if (!isRetroValue(raw as HabitValue)) return { q: '', a: '' };
      const v = raw as RetroValue;
      return {
        q: typeof v.q === 'string' ? v.q.slice(0, 64) : '',
        a: typeof v.a === 'string' ? v.a.slice(0, cfg.maxLength ?? 4000) : '',
      };
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
    case 'retro':
      return isRetroValue(value)
        ? { ...empty, txt: value.a, meta: { q: value.q } }
        : empty;
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
    case 'retro': {
      const meta = cols.meta as { q?: unknown } | null | undefined;
      return { q: typeof meta?.q === 'string' ? meta.q : '', a: cols.txt ?? '' };
    }
  }
}

/**
 * Whether a value is worth a row. Storing only what differs from the default
 * keeps "how much of today did I actually fill in" answerable — a habit with no
 * row is one you skipped, not one you deliberately recorded as zero.
 */
export function isRecorded(habit: Habit, value: HabitValue): boolean {
  if (habit.kind === 'text') return typeof value === 'string' && value.trim() !== '';
  if (habit.kind === 'retro') return isRetroValue(value) && value.a.trim() !== '';
  return value !== defaultValue(habit) && value !== null;
}

export function emptyDay(date: string): DayEntry {
  return { date, values: {}, updatedAt: null };
}

/** The value to show in the form: what was recorded, else the habit's default. */
export function valueFor(entry: DayEntry, habit: Habit): HabitValue {
  const v = entry.values[habit.key];
  return v === undefined ? defaultValue(habit) : v;
}

/**
 * Did this value represent something actually happening?
 *
 * Used only to decide whether a group's completion flourish fires. The bar sits
 * at "more than nothing" on purpose: it rewards having done something, never
 * how much, and it sits low enough that clearing it honestly is cheaper than
 * faking it. Anything that scales the reward with the number would turn it into
 * a reward for performance -- see the rule in CLAUDE.md.
 */
export function hasActivity(habit: Habit, value: HabitValue): boolean {
  switch (habit.kind) {
    case 'scale':
    case 'counter':
    case 'duration':
      return typeof value === 'number' && value > 0;
    case 'boolean':
      return value === true;
    case 'choice': {
      const option = (habit.config.options ?? []).find((o) => o.value === value);
      return option?.tone === 'good';
    }
    default:
      return false;
  }
}

/**
 * A value in as few characters as possible, for the one line a folded group
 * leaves behind. Long enough to recognise what was entered, short enough that
 * a whole group fits on a phone without wrapping.
 */
export function summarize(habit: Habit, value: HabitValue): string {
  switch (habit.kind) {
    case 'duration': {
      const total = Math.round(typeof value === 'number' ? value : 0);
      const h = Math.floor(total / 60);
      const m = total % 60;
      return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h}.${String(m).padStart(2, '0')}`;
    }
    case 'scale':
    case 'counter': {
      const n = typeof value === 'number' ? value : 0;
      return habit.config.unit ? `${n} ${habit.config.unit}` : String(n);
    }
    case 'boolean':
      return value === true ? '✓' : '✗';
    case 'choice': {
      const option = (habit.config.options ?? []).find((o) => o.value === value);
      if (!option) return '—';
      // Option labels often lead with their own tick or cross; one is enough.
      return option.label.replace(/^[✓✗]\s*/, '');
    }
    case 'text':
      return typeof value === 'string' && value.trim() !== '' ? '✎' : '—';
    case 'retro':
      return isRetroValue(value) && value.a.trim() !== '' ? '✎' : '—';
  }
}
