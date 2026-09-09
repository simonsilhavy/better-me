import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, touchSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Keeps a session alive while its page is open, and hands the page its own
 * session tag. The page asks for the tag rather than being told it at render
 * time: the root layout survives client-side navigation, so a tag passed as a
 * prop would be frozen at whatever it was on first load — null, right after
 * logging in.
 */
export async function POST() {
  const store = await cookies();
  const alive = await touchSession(store.get(SESSION_COOKIE)?.value);

  return alive
    ? NextResponse.json({ tag: alive.tag })
    : NextResponse.json({ error: 'Session ended' }, { status: 401 });
}
