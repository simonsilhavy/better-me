export const TIME_ZONE = 'Europe/Prague';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

/** Today's date in the user's timezone, not the server's. */
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Inclusive list of dates from `from` to `to`. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1)) out.push(d);
  return out;
}

const CS_WEEKDAYS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

export function weekday(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return CS_WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function formatCz(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d}. ${m}. ${y}`;
}

export function shortLabel(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d}.${m}.`;
}

/**
 * Czech counts days in three shapes: 1 den, 2-4 dny, 5+ dní. Getting this
 * wrong reads as broken text, so the count and the noun travel together.
 */
export function czDays(n: number): string {
  if (n === 1) return '1 den';
  if (n >= 2 && n <= 4) return `${n} dny`;
  return `${n} dní`;
}

/**
 * The hour of day (0-23) in the app's timezone, not the machine's.
 *
 * Used by the retrospective cover, which opens at a wall-clock hour rather
 * than after some interval — so it has to mean the same thing on a server in
 * UTC as on a phone in Prague.
 */
export function localHour(now: Date = new Date()): number {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return Number(formatted);
}
