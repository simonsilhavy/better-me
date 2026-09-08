import { and, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { loginAttempts } from '@/db/schema';

/**
 * Two layers of rate limiting.
 *
 * Per IP: a couple of free tries, then a lockout doubling from 30 s to an hour.
 * This is the layer that gives an honest typo a gentle answer.
 *
 * Globally: a hard ceiling on failures per hour across every client. IP is
 * self-reported at the edge of any CDN, and an attacker with a proxy pool has
 * effectively unlimited identities — so the per-IP layer can't be the last line
 * of defence. The global counter is the one that actually bounds how many
 * guesses a 6-digit PIN can ever face.
 */

const FREE_ATTEMPTS = 2;
const BASE_LOCK_SECONDS = 30;
const MAX_LOCK_SECONDS = 60 * 60;
/** A quiet spell this long forgets an IP's failures. */
const DECAY_MINUTES = 30;

export const GLOBAL_KEY = '__global__';
const GLOBAL_MAX_PER_HOUR = 60;
const GLOBAL_LOCK_SECONDS = 15 * 60;

export type ThrottleState =
  | { blocked: true; retryAfterMs: number }
  | { blocked: false };

function remaining(lockedUntil: Date | null): number {
  return lockedUntil ? lockedUntil.getTime() - Date.now() : 0;
}

export async function checkThrottle(ip: string): Promise<ThrottleState> {
  const rows = await db
    .select({ lockedUntil: loginAttempts.lockedUntil })
    .from(loginAttempts)
    .where(inArray(loginAttempts.key, [ip, GLOBAL_KEY]));

  const worst = Math.max(0, ...rows.map((r) => remaining(r.lockedUntil)));
  return worst > 0 ? { blocked: true, retryAfterMs: worst } : { blocked: false };
}

/**
 * The increment happens inside ON CONFLICT DO UPDATE, where Postgres holds a
 * row lock and `login_attempts.fails` is the pre-update value. Doing the
 * read-modify-write in one statement is what stops a burst of parallel guesses
 * from all reading the same stale counter and slipping through together.
 */
async function bump(
  key: string,
  freeAttempts: number,
  lockExpr: ReturnType<typeof sql>,
): Promise<Date | null> {
  const [row] = await db
    .insert(loginAttempts)
    .values({ key, fails: 1, lockedUntil: null })
    .onConflictDoUpdate({
      target: loginAttempts.key,
      set: {
        fails: sql`${loginAttempts.fails} + 1`,
        lockedUntil: sql`case when ${loginAttempts.fails} + 1 > ${freeAttempts} then ${lockExpr} else null end`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ lockedUntil: loginAttempts.lockedUntil });

  return row?.lockedUntil ?? null;
}

export async function recordFailure(ip: string): Promise<ThrottleState> {
  const now = sql`now()`;

  // Forget this IP's history if it has been quiet, and reopen the global
  // window once its hour is up. Deleting rather than resetting also keeps the
  // table from growing without bound when an attacker rotates addresses.
  await db.delete(loginAttempts).where(
    or(
      and(
        eq(loginAttempts.key, ip),
        lt(loginAttempts.updatedAt, sql`${now} - make_interval(mins => ${DECAY_MINUTES})`),
        or(isNull(loginAttempts.lockedUntil), lt(loginAttempts.lockedUntil, now)),
      ),
      and(
        eq(loginAttempts.key, GLOBAL_KEY),
        lt(loginAttempts.windowStart, sql`${now} - make_interval(hours => 1)`),
        or(isNull(loginAttempts.lockedUntil), lt(loginAttempts.lockedUntil, now)),
      ),
      // Sweep abandoned rows so a rotating attacker can't inflate the table.
      and(
        sql`${loginAttempts.key} <> ${GLOBAL_KEY}`,
        lt(loginAttempts.updatedAt, sql`${now} - make_interval(days => 1)`),
      ),
    ),
  );

  const [ipLock, globalLock] = await Promise.all([
    bump(
      ip,
      FREE_ATTEMPTS,
      sql`now() + make_interval(secs => least(
            ${BASE_LOCK_SECONDS}::double precision
              * power(2, ${loginAttempts.fails} + 1 - ${FREE_ATTEMPTS} - 1),
            ${MAX_LOCK_SECONDS}::double precision))`,
    ),
    bump(
      GLOBAL_KEY,
      GLOBAL_MAX_PER_HOUR,
      sql`now() + make_interval(secs => ${GLOBAL_LOCK_SECONDS}::double precision)`,
    ),
  ]);

  const worst = Math.max(remaining(ipLock), remaining(globalLock));
  return worst > 0 ? { blocked: true, retryAfterMs: worst } : { blocked: false };
}

/** Only clears the IP's own record — the global window is not a success signal. */
export async function clearFailures(ip: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.key, ip));
}

export function formatWait(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.ceil(s / 60);
  return m < 60 ? `${m} min` : `${Math.ceil(m / 60)} h`;
}
