'use client';

import { useActionState } from 'react';
import { login, type LoginState } from './actions';

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form action={formAction} className="bm-card w-full max-w-sm p-6">
        <h1 className="text-lg font-bold">
          Better<span style={{ color: 'var(--accent)' }}>Me</span>
        </h1>
        <p className="mt-1 mb-5 text-sm text-[var(--muted)]">
          Zadej heslo pro přístup.
        </p>

        <input type="hidden" name="next" value={next} />
        <input
          type="password"
          name="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Heslo"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
        />

        {state.error ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--loss)' }} role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-[#0e0f13] disabled:opacity-60"
          style={{ background: 'var(--accent)' }}
        >
          {pending ? 'Ověřuji…' : 'Vstoupit'}
        </button>
      </form>
    </div>
  );
}
