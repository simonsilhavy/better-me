import type { EntryRow } from '@/db/schema';

export const SPRCHA_VALUES = ['none', 'partial', 'full'] as const;
export const PROTAHOVANI_VALUES = ['horni', 'dolni', 'cele'] as const;
export const VERDICT_VALUES = ['win', 'loss'] as const;

export type Sprcha = (typeof SPRCHA_VALUES)[number];
export type Protahovani = (typeof PROTAHOVANI_VALUES)[number];
export type Verdict = (typeof VERDICT_VALUES)[number];

/** Shape used by the form, the API and the seed file. */
export type Entry = {
  date: string;
  energyMorning: number;
  energyUsed: number;
  kliky: number;
  drepy: number;
  shake: number;
  sprcha: Sprcha;
  protahovani: Protahovani | null;
  dpMinutes: number;
  instagram: boolean;
  resolveNow: boolean;
  verdict: Verdict | null;
  note: string;
  updatedAt?: string | null;
};

export const SLIDERS = {
  energyMorning: { min: 0, max: 100, step: 10 },
  energyUsed: { min: 0, max: 100, step: 10 },
  kliky: { min: 0, max: 250, step: 5 },
  drepy: { min: 0, max: 250, step: 5 },
  dpMinutes: { min: 0, max: 480, step: 15 },
} as const;

export const SPRCHA_LABELS: Record<Sprcha, string> = {
  none: 'Žádná',
  partial: 'Částečná',
  full: 'Celá',
};

export const PROTAHOVANI_LABELS: Record<Protahovani, string> = {
  horni: 'Horní',
  dolni: 'Dolní',
  cele: 'Celé',
};

export const SHAKE_LABELS = ['0', '1', '2'];

export function emptyEntry(date: string): Entry {
  return {
    date,
    energyMorning: 0,
    energyUsed: 0,
    kliky: 0,
    drepy: 0,
    shake: 0,
    sprcha: 'none',
    protahovani: null,
    dpMinutes: 0,
    instagram: false,
    resolveNow: false,
    verdict: null,
    note: '',
    updatedAt: null,
  };
}

export function rowToEntry(row: EntryRow): Entry {
  return {
    date: row.date,
    energyMorning: row.energyMorning,
    energyUsed: row.energyUsed,
    kliky: row.kliky,
    drepy: row.drepy,
    shake: row.shake,
    sprcha: (SPRCHA_VALUES as readonly string[]).includes(row.sprcha)
      ? (row.sprcha as Sprcha)
      : 'none',
    protahovani: (PROTAHOVANI_VALUES as readonly string[]).includes(
      row.protahovani ?? '',
    )
      ? (row.protahovani as Protahovani)
      : null,
    dpMinutes: row.dpMinutes,
    instagram: row.instagram,
    resolveNow: row.resolveNow,
    verdict: (VERDICT_VALUES as readonly string[]).includes(row.verdict ?? '')
      ? (row.verdict as Verdict)
      : null,
    note: row.note,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

const clampStep = (raw: unknown, min: number, max: number, step: number) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n / step) * step));
};

/**
 * Coerces arbitrary JSON (API body / seed file) into a valid Entry.
 * Anything missing or out of range falls back to the empty-day default,
 * so a bad payload can never write nonsense into the DB.
 */
export function parseEntry(date: string, input: unknown): Entry {
  const raw = (input ?? {}) as Record<string, unknown>;
  const base = emptyEntry(date);

  const bool = (v: unknown, fallback: boolean) =>
    typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : fallback;

  return {
    date,
    energyMorning:
      raw.energyMorning === undefined
        ? base.energyMorning
        : clampStep(raw.energyMorning, 0, 100, 10),
    energyUsed:
      raw.energyUsed === undefined
        ? base.energyUsed
        : clampStep(raw.energyUsed, 0, 100, 10),
    kliky: raw.kliky === undefined ? base.kliky : clampStep(raw.kliky, 0, 250, 5),
    drepy: raw.drepy === undefined ? base.drepy : clampStep(raw.drepy, 0, 250, 5),
    shake: raw.shake === undefined ? base.shake : clampStep(raw.shake, 0, 2, 1),
    sprcha: (SPRCHA_VALUES as readonly string[]).includes(String(raw.sprcha))
      ? (raw.sprcha as Sprcha)
      : base.sprcha,
    protahovani: (PROTAHOVANI_VALUES as readonly string[]).includes(
      String(raw.protahovani),
    )
      ? (raw.protahovani as Protahovani)
      : null,
    dpMinutes:
      raw.dpMinutes === undefined
        ? base.dpMinutes
        : clampStep(raw.dpMinutes, 0, 1440, 5),
    instagram: bool(raw.instagram, base.instagram),
    resolveNow: bool(raw.resolveNow, base.resolveNow),
    verdict: (VERDICT_VALUES as readonly string[]).includes(String(raw.verdict))
      ? (raw.verdict as Verdict)
      : null,
    note: typeof raw.note === 'string' ? raw.note.slice(0, 4000) : base.note,
  };
}

/** A day counts as "logged" if anything at all was recorded on it. */
export function isLogged(e: Entry): boolean {
  return (
    e.energyMorning > 0 ||
    e.energyUsed > 0 ||
    e.kliky > 0 ||
    e.drepy > 0 ||
    e.shake > 0 ||
    e.sprcha !== 'none' ||
    e.protahovani !== null ||
    e.dpMinutes > 0 ||
    e.instagram ||
    e.resolveNow ||
    e.verdict !== null ||
    e.note.trim() !== ''
  );
}
