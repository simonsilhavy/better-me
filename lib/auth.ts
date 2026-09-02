import { NextResponse } from 'next/server';

/**
 * Guards the write side of the public API. Set API_TOKEN in Vercel to enable
 * `Authorization: Bearer <token>` writes (this is what lets Claude-in-chat PUT
 * a day directly). With no API_TOKEN configured, external writes are refused
 * outright rather than left open.
 */
export function checkApiToken(request: Request): NextResponse | null {
  const expected = process.env.API_TOKEN;

  if (!expected) {
    return NextResponse.json(
      { error: 'API writes are disabled: API_TOKEN is not configured.' },
      { status: 503 },
    );
  }

  const header = request.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
