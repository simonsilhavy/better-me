'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { submitPin } from './actions';

export const PIN_LENGTH = 6;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function PinPad({ next }: { next: string }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [pending, startTransition] = useTransition();

  const submitting = useRef(false);

  // Submit as soon as the last digit lands, so there's no confirm button.
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || submitting.current) return;

    submitting.current = true;
    startTransition(async () => {
      const result = await submitPin(pin, next);
      submitting.current = false;
      // A successful login redirects, so anything returned is a failure.
      if (result?.error) {
        setError(result.error);
        setPin('');
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
    });
  }, [pin, next]);

  const press = useCallback((key: string) => {
    if (submitting.current) return;

    if (key === '⌫') {
      setError('');
      setPin((p) => p.slice(0, -1));
      return;
    }

    if (!/^\d$/.test(key)) return;

    setError('');
    setPin((prev) => (prev.length >= PIN_LENGTH ? prev : prev + key));
  }, []);

  // Physical keyboard, for when this is open on a laptop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        press('⌫');
      } else if (/^\d$/.test(e.key)) {
        press(e.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-xl font-bold">
          Better<span style={{ color: 'var(--accent)' }}>Me</span>
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Zadej PIN</p>
      </div>

      {/* progress dots */}
      <div
        className="flex gap-3.5"
        style={shake ? { animation: 'bm-shake 0.4s' } : undefined}
        role="status"
        aria-label={`Zadáno ${pin.length} z ${PIN_LENGTH} číslic`}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className="h-3.5 w-3.5 rounded-full border-2 transition-colors"
            style={{
              borderColor: error ? 'var(--loss)' : 'var(--border)',
              background:
                i < pin.length
                  ? error
                    ? 'var(--loss)'
                    : 'var(--accent)'
                  : 'transparent',
            }}
          />
        ))}
      </div>

      <p
        className="h-5 text-center text-sm"
        style={{ color: 'var(--loss)' }}
        role="alert"
      >
        {error}
      </p>

      <div className="grid grid-cols-3 gap-4">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={pending}
              onClick={() => press(key)}
              aria-label={key === '⌫' ? 'Smazat číslici' : key}
              className="bm-key flex h-18 w-18 items-center justify-center rounded-full text-2xl font-medium disabled:opacity-40"
            >
              {key}
            </button>
          ),
        )}
      </div>

      <p className="h-5 text-xs text-[var(--muted)]">
        {pending ? 'Ověřuji…' : ''}
      </p>
    </div>
  );
}
