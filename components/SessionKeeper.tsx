'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HEARTBEAT_MS } from '@/lib/session-constants';

/**
 * Ties the session to this page being open.
 *
 * While the page lives it sends a heartbeat, and when the page goes away it
 * tells the server to drop the session. Browsers restore session cookies when
 * they reopen, so "close the app and you're logged out" has to be enforced by
 * the server rather than by cookie attributes.
 */
export function SessionKeeper() {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;

    const beat = async () => {
      if (stopped || document.visibilityState === 'hidden') return;
      try {
        const response = await fetch('/api/session/ping', { method: 'POST' });
        if (response.status === 401) router.replace('/login');
      } catch {
        // Offline or a flaky network — the next beat will catch up.
      }
    };

    const timer = setInterval(beat, HEARTBEAT_MS);

    // pagehide covers closing the tab, closing the browser and backgrounding on
    // mobile; client-side navigation inside the app does not fire it.
    const onPageHide = () => {
      navigator.sendBeacon('/api/session/close');
    };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [router]);

  return null;
}
