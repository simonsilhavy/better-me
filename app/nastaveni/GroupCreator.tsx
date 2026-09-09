'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addGroup } from './actions';

export function GroupCreator() {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!label.trim()) return;
    setError('');
    startTransition(async () => {
      const r = await addGroup(label);
      if (r.ok) { setLabel(''); router.refresh(); } else setError(r.error);
    });
  };

  return (
    <div className="bm-card flex flex-col gap-2 p-3">
      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Nový oddíl, třeba Spánek"
          maxLength={60}
          className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
        />
        <button type="button" onClick={submit} disabled={pending || !label.trim()}
          className="cursor-pointer rounded-xl px-4 text-sm font-semibold text-[#0e0f13] disabled:opacity-50"
          style={{ background: 'var(--accent)' }}>
          Přidat
        </button>
      </div>
      {error ? <p className="text-xs" style={{ color: 'var(--loss)' }} role="alert">{error}</p> : null}
    </div>
  );
}
