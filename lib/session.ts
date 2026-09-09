import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { sessions } from '@/db/schema';

export const SESSION_COOKIE = 'bm_session';

/**
 * How long a session survives without a heartbeat. An open page keeps beating,
 * a closed one stops, and the session lapses.
 *
 * Three minutes, not seconds: a browser sends its background tabs to sleep, so
 * a short window ended sessions while the app was merely behind another app for
 * a moment. This is also the window in which a reopened browser is still logged
 * in — the price of not having a reliable "the app closed" signal.
 *
 * The heartbeat runs every minute, so a visible page has two beats of slack
 * before the window closes on it.
 */
export const SESSION_TTL_MS = 3 * 60_000;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
} as const;

/** The gate is only active once a PIN is configured. */
export function gateConfig() {
  const pin = process.env.APP_PIN;
  return pin ? { pin } : null;
}

function newSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export type NewSession = { id: string; tag: string };

export async function createSession(): Promise<NewSession> {
  const id = newSessionId();
  const tag = newSessionId().slice(0, 32);
  await db.insert(sessions).values({
    id,
    tag,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return { id, tag };
}

/** Returns the live session's tag, or null when there isn't one. */
export async function validateSession(
  id: string | undefined,
): Promise<{ tag: string } | null> {
  if (!id || !/^[0-9a-f]{64}$/.test(id)) return null;

  const [row] = await db
    .select({ tag: sessions.tag })
    .from(sessions)
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);

  return row ? { tag: row.tag } : null;
}

/** Extends a live session and returns its tag, or null if it has gone. */
export async function touchSession(
  id: string | undefined,
): Promise<{ tag: string } | null> {
  if (!id || !/^[0-9a-f]{64}$/.test(id)) return null;

  const [row] = await db
    .update(sessions)
    .set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, sql`now()`)))
    .returning({ tag: sessions.tag });

  // Cheap opportunistic sweep; the table should never hold more than a few rows.
  await db.delete(sessions).where(lt(sessions.expiresAt, sql`now()`));

  return row ? { tag: row.tag } : null;
}

export async function closeSession(id: string | undefined): Promise<void> {
  if (!id) return;
  await db.delete(sessions).where(eq(sessions.id, id));
}


export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
