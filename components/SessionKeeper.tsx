'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { HEARTBEAT_MS } from '@/lib/session-constants';

/**
 * Ties the session to this page being open.
 *
 * The session lives server-side with a short lifetime and is kept alive by this
 * heartbeat. Stop beating — close the tab, close the browser, put the phone
 * away — and it expires on its own.
 *
 * An earlier version also sent a `pagehide` beacon so that closing the app
 * ended the session that instant. It had to go: a beacon fires on ordinary
 * same-tab navigation too, where it revoked the session the page being opened
 * was about to use, and cookies are shared across an origin's pages, so the
 * departing page could not reliably tell its own session from its successor's.
 * A predictable short window beats being logged out mid-use at random.
 */
export function SessionKeeper() {
  const router = useRouter();
  // The root layout survives client-side navigation, so this does not remount
  // when you log in; re-running per route change keeps the beat going.
  const pathname = usePathname();

  useEffect(() => {
    let stopped = false;

    const beat = async () => {
      if (stopped) return;
      try {
        const response = await fetch('/api/session/ping', { method: 'POST' });
        if (response.status === 401) router.replace('/login');
      } catch {
        // Offline or a flaky network — the next beat will catch up.
      }
    };

    void beat();
    const timer = setInterval(beat, HEARTBEAT_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [router, pathname]);

  return null;
}
