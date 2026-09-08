'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  gateConfig,
  issueSession,
  timingSafeEqual,
} from '@/lib/session';
import {
  checkThrottle,
  clearFailures,
  formatWait,
  recordFailure,
} from '@/lib/throttle';

export type LoginResult = { error: string } | void;

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

export async function submitPin(pin: string, next: string): Promise<LoginResult> {
  const gate = gateConfig();
  if (!gate) redirect('/');

  const ip = await clientIp();

  let blocked;
  try {
    blocked = await checkThrottle(ip);
  } catch (error) {
    console.error('throttle check failed', error);
    return { error: 'Přihlášení je dočasně nedostupné.' };
  }

  if (blocked.blocked) {
    return { error: `Příliš mnoho pokusů. Zkus to za ${formatWait(blocked.retryAfterMs)}.` };
  }

  if (!timingSafeEqual(pin, gate.pin)) {
    const state = await recordFailure(ip);
    return {
      error: state.blocked
        ? `Špatný PIN. Další pokus za ${formatWait(state.retryAfterMs)}.`
        : 'Špatný PIN.',
    };
  }

  await clearFailures(ip);

  const store = await cookies();
  store.set(SESSION_COOKIE, await issueSession(gate.secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  // Only ever bounce back to a path on this site.
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}
