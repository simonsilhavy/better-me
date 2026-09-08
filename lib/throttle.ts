import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { loginAttempts } from '@/db/schema';

/** Free attempts before lockouts start. */
const FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 60 * 60_000;
/** A quiet spell this long clears the counter, so honest typos don't accumulate. */
const DECAY_MS = 30 * 60_000;

function lockDuration(fails: number): number {
  const step = fails - FREE_ATTEMPTS;
  return Math.min(BASE_LOCK_MS * 2 ** Math.max(0, step), MAX_LOCK_MS);
}

export type ThrottleState = { blocked: true; retryAfterMs: number } | { blocked: false };

export async function checkThrottle(ip: string): Promise<ThrottleState> {
  const [row] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.ip, ip))
    .limit(1);

  if (!row?.lockedUntil) return { blocked: false };

  const remaining = row.lockedUntil.getTime() - Date.now();
  return remaining > 0 ? { blocked: true, retryAfterMs: remaining } : { blocked: false };
}

export async function recordFailure(ip: string): Promise<ThrottleState> {
  const [row] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.ip, ip))
    .limit(1);

  const now = Date.now();
  const decayed = row && now - row.updatedAt.getTime() > DECAY_MS && !row.lockedUntil;
  const fails = (decayed || !row ? 0 : row.fails) + 1;

  const lockedUntil =
    fails > FREE_ATTEMPTS ? new Date(now + lockDuration(fails)) : null;

  const values = { ip, fails, lockedUntil, updatedAt: new Date(now) };
  await db
    .insert(loginAttempts)
    .values(values)
    .onConflictDoUpdate({ target: loginAttempts.ip, set: values });

  return lockedUntil
    ? { blocked: true, retryAfterMs: lockedUntil.getTime() - now }
    : { blocked: false };
}

export async function clearFailures(ip: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.ip, ip));
}

export function formatWait(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.ceil(s / 60);
  return m < 60 ? `${m} min` : `${Math.ceil(m / 60)} h`;
}
