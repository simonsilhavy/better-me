import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { sessions } from '@/db/schema';

export const SESSION_COOKIE = 'bm_session';

/**
 * Backstop lifetime. The page extends it with a heartbeat while it is open and
 * drops the session outright when it closes, so this only decides how long a
 * session lingers when the browser dies without a chance to say goodbye.
 */
export const SESSION_TTL_MS = 2 * 60_000;

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

export async function createSession(): Promise<string> {
  const id = newSessionId();
  await db.insert(sessions).values({
    id,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return id;
}

export async function isValidSession(id: string | undefined): Promise<boolean> {
  if (!id || !/^[0-9a-f]{64}$/.test(id)) return false;

  const [row] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);

  return Boolean(row);
}

/** Extends a live session. Returns false if it has already gone. */
export async function touchSession(id: string | undefined): Promise<boolean> {
  if (!id || !/^[0-9a-f]{64}$/.test(id)) return false;

  const [row] = await db
    .update(sessions)
    .set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, sql`now()`)))
    .returning({ id: sessions.id });

  // Cheap opportunistic sweep; the table should never hold more than a few rows.
  await db.delete(sessions).where(lt(sessions.expiresAt, sql`now()`));

  return Boolean(row);
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
