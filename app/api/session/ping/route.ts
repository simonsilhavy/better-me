import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, touchSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Keeps a session alive while its page is open. Without this heartbeat a
// session expires on its own within SESSION_TTL_MS.
export async function POST() {
  const store = await cookies();
  const alive = await touchSession(store.get(SESSION_COOKIE)?.value);
  return alive
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json({ error: 'Session ended' }, { status: 401 });
}
