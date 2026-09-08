'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  gateConfig,
  issueSession,
  timingSafeEqual,
} from '@/lib/session';

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const gate = gateConfig();
  if (!gate) redirect('/');

  const submitted = String(formData.get('password') ?? '');
  if (!timingSafeEqual(submitted, gate.password)) {
    // Blunt the brute-force rate a little without holding a request open long.
    await new Promise((r) => setTimeout(r, 400));
    return { error: 'Špatné heslo.' };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await issueSession(gate.secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  const next = String(formData.get('next') ?? '');
  // Only ever bounce back to a path on this site.
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}
