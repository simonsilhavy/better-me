import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  gateConfig,
  isValidSession,
  issueSession,
  timingSafeEqual,
} from '@/lib/session';

export const config = {
  // Everything except Next's own static output and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export async function middleware(request: NextRequest) {
  const gate = gateConfig();
  if (!gate) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === '/login') return NextResponse.next();

  // Scripts and the chat relay authenticate with the API token instead of the
  // password, so automation keeps working while the UI stays gated.
  const apiToken = process.env.API_TOKEN;
  const header = request.headers.get('authorization') ?? '';
  if (
    apiToken &&
    header.startsWith('Bearer ') &&
    timingSafeEqual(header.slice(7), apiToken)
  ) {
    return NextResponse.next();
  }

  if (await isValidSession(gate.sessionKey, request.cookies.get(SESSION_COOKIE)?.value)) {
    // Slide the idle window forward, so it only runs down while the app is
    // genuinely unused rather than mid-session.
    const response = NextResponse.next();
    response.cookies.set(
      SESSION_COOKIE,
      await issueSession(gate.sessionKey),
      SESSION_COOKIE_OPTIONS,
    );
    return response;
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
