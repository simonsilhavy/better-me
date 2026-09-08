import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, closeSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Called by navigator.sendBeacon as the page goes away, so closing the app ends
// the session immediately rather than waiting for it to time out.
export async function POST() {
  const store = await cookies();
  await closeSession(store.get(SESSION_COOKIE)?.value);
  return new NextResponse(null, { status: 204 });
}
