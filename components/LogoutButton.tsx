'use client';

import { useTransition } from 'react';
import { logout } from '@/app/actions';

/**
 * Logging out takes a round trip to the server, and the button gave no sign it
 * had been pressed — so it read as broken and invited a second tap.
 */
export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label="Odhlásit"
      title="Odhlásit"
      disabled={pending}
      onClick={() => startTransition(async () => { await logout(); })}
      className="bm-seg bm-danger bm-press cursor-pointer rounded-lg px-3 py-1.5 disabled:cursor-default"
      style={pending ? { background: 'var(--loss)', borderColor: 'var(--loss)', color: '#0e0f13' } : undefined}
    >
      {pending ? '…' : '⏻'}
    </button>
  );
}
