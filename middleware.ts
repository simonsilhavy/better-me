import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, gateConfig, timingSafeEqual, validateSession } from '@/lib/session';

export const config = {
  // Everything except Next's own static output and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
  // Sessions live in Postgres, so the check needs a real runtime.
  runtime: 'nodejs',
};

export async function middleware(request: NextRequest) {
  const gate = gateConfig();
  if (!gate) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === '/login') return NextResponse.next();

  // Scripts authenticate with the API token instead of the PIN, so automation
  // keeps working while the UI stays gated.
  //
  // Only under /api/ on purpose. The token used to open every address, which
  // made it a second key to the whole app: whoever held it could read the
  // diary page by page without ever meeting the PIN. A token is a long-lived
  // string that sits in a deployment's environment and gets pasted into
  // scripts; it deserves far less reach than the PIN, which is typed once per
  // session and expires. Narrowed, a leaked token can still be used to read
  // and write days through the API — that is what it is for — but the app
  // itself stays behind the gate.
  const apiToken = process.env.API_TOKEN;
  const header = request.headers.get('authorization') ?? '';
  if (
    pathname.startsWith('/api/') &&
    apiToken &&
    header.startsWith('Bearer ') &&
    timingSafeEqual(header.slice(7), apiToken)
  ) {
    return NextResponse.next();
  }

  if (await validateSession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search =
    pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}
