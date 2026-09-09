'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Habit, HabitGroup } from '@/lib/domain';
import { editGroup, shiftGroup, toggleGroup } from './actions';
import { HabitRow } from './HabitRow';

export function GroupSection({
  group, habits, groups,
}: {
  group: HabitGroup | null;
  habits: Habit[];
  groups: HabitGroup[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(group?.label ?? '');
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

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1 pt-2">
        {group ? (
          <>
            <button type="button" aria-label="Oddíl nahoru" disabled={pending}
              onClick={() => act(() => shiftGroup(group.id, -1))}
              className="bm-seg cursor-pointer rounded px-1.5 text-[10px] leading-5">▲</button>
            <button type="button" aria-label="Oddíl dolů" disabled={pending}
              onClick={() => act(() => shiftGroup(group.id, 1))}
              className="bm-seg cursor-pointer rounded px-1.5 text-[10px] leading-5">▼</button>
          </>
        ) : null}

        {editing && group ? (
          <input
            value={label}
            autoFocus
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => { setEditing(false); if (label.trim() && label !== group.label) act(() => editGroup(group.id, label)); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="flex-1 rounded-lg border border-[var(--accent)] bg-[var(--panel-2)] px-2 py-1 text-sm"
          />
        ) : (
          <h2
            className="flex-1 cursor-text text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
            onClick={() => group && setEditing(true)}
          >
            {group?.label ?? 'Bez oddílu'}
          </h2>
        )}

        {group ? (
          <button type="button" disabled={pending}
            onClick={() => act(() => toggleGroup(group.id, true))}
            className="bm-seg cursor-pointer rounded-lg px-2 py-1 text-[11px]">
            Archivovat
          </button>
        ) : null}
      </div>

      {error ? <p className="px-1 text-xs" style={{ color: 'var(--loss)' }} role="alert">{error}</p> : null}

      {habits.length === 0 ? (
        <p className="px-1 pb-1 text-xs text-[var(--muted)]">Prázdný oddíl — v zápisu se nezobrazí.</p>
      ) : (
        habits.map((h) => <HabitRow key={h.id} habit={h} groups={groups} />)
      )}
    </section>
  );
}
