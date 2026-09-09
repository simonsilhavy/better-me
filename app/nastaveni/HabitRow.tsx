'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Habit, HabitGroup } from '@/lib/domain';
import { editHabit, habitValueCount, reassignHabit, removeHabit, shiftHabit, toggleHabit } from './actions';

const KIND_LABEL: Record<string, string> = {
  counter: 'Počet', scale: 'Míra v %', duration: 'Čas',
  boolean: 'Ano / ne', choice: 'Volba', text: 'Text',
};

export function HabitRow({ habit, groups }: { habit: Habit; groups: HabitGroup[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(habit.label);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError('');
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? 'Nepovedlo se.');
      else router.refresh();
    });
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const n = await habitValueCount(habit.id);
      const message =
        n === 0
          ? `Smazat „${habit.label}“? Nemá zatím žádná data.`
          : `Smazat „${habit.label}“? Přijdeš o ${n} zapsaných hodnot. Tohle nejde vrátit.\n\nChceš-li si data nechat, zavři habit přepínačem místo mazání.`;
      if (!window.confirm(message)) return;
      const r = await removeHabit(habit.id);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <div className="bm-card flex flex-col gap-2 p-3" style={{ opacity: habit.archived ? 0.55 : 1 }}>
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <button type="button" aria-label="Nahoru" disabled={pending}
            onClick={() => act(() => shiftHabit(habit.id, -1))}
            className="bm-seg cursor-pointer rounded px-1.5 text-[10px] leading-4">▲</button>
          <button type="button" aria-label="Dolů" disabled={pending}
            onClick={() => act(() => shiftHabit(habit.id, 1))}
            className="bm-seg cursor-pointer rounded px-1.5 text-[10px] leading-4">▼</button>
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={label}
              autoFocus
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => { setEditing(false); if (label.trim() && label !== habit.label) act(() => editHabit(habit.id, label)); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="w-full rounded-lg border border-[var(--accent)] bg-[var(--panel-2)] px-2 py-1 text-sm"
            />
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="block w-full cursor-text text-left">
              <span className="block truncate text-sm font-medium">{habit.label}</span>
              <span className="block text-[11px] text-[var(--muted)]">
                {KIND_LABEL[habit.kind] ?? habit.kind}
                {habit.role === 'verdict' ? ' · drží série' : habit.role === 'note' ? ' · poznámka dne' : ''}
              </span>
            </button>
          )}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={!habit.archived}
          aria-label={habit.archived ? 'Zapnout habit' : 'Vypnout habit'}
          disabled={pending}
          onClick={() => act(() => toggleHabit(habit.id, !habit.archived))}
          className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors"
          style={{ background: habit.archived ? 'var(--track)' : 'var(--win)' }}
        >
          <span className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
                style={{ left: habit.archived ? '0.25rem' : '1.5rem' }} />
        </button>
      </div>

      <div className="flex items-center gap-2 pl-8">
        <select
          value={habit.groupId ?? ''}
          disabled={pending}
          onChange={(e) => act(() => reassignHabit(habit.id, e.target.value === '' ? null : Number(e.target.value)))}
          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1 text-xs text-[var(--text)]"
        >
          {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          <option value="">Bez oddílu</option>
        </select>
        <button type="button" disabled={pending} onClick={confirmDelete}
          className="bm-seg cursor-pointer rounded-lg px-2.5 py-1 text-xs" style={{ color: 'var(--loss)' }}>
          Smazat
        </button>
      </div>

      {error ? <p className="pl-8 text-xs" style={{ color: 'var(--loss)' }} role="alert">{error}</p> : null}
    </div>
  );
}
