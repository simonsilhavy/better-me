'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSession,
  gateConfig,
  timingSafeEqual,
} from '@/lib/session';
import {
  checkThrottle,
  clearFailures,
  formatWait,
  recordFailure,
} from '@/lib/throttle';

export type LoginResult = { error: string } | void;

/**
 * `x-forwarded-for` is a list the client can prepend to, so its first entry is
 * attacker-controlled — trusting it hands out a fresh rate-limit bucket per
 * request. Vercel sets `x-real-ip` itself, and the last `x-forwarded-for` entry
 * is the one its proxy appended, so both are outside the client's reach.
 */
async function clientIp(): Promise<string> {
  const h = await headers();

  const real = h.get('x-real-ip')?.trim();
  if (real) return real;

  const hops = h.get('x-forwarded-for')?.split(',') ?? [];
  return hops.at(-1)?.trim() || 'unknown';
}

/** Only ever bounce back to a path on this site. */
function safeNext(next: string): string {
  // Browsers read a leading "//" or "/\" as protocol-relative, i.e. offsite.
  return /^\/(?![/\\])[\w\-./?=&%]*$/.test(next) ? next : '/';
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
  store.set(SESSION_COOKIE, await createSession(), SESSION_COOKIE_OPTIONS);

  redirect(safeNext(next));
}
