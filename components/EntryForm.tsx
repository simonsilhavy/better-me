'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveDay } from '@/app/actions';
import type { DayEntry, Habit, HabitGroup, HabitValue } from '@/lib/domain';
import { defaultValue, isRecorded } from '@/lib/domain';
import { addDays, formatCz, today, weekday } from '@/lib/date';
import { HabitControl } from './HabitControl';
import { GroupPanel } from './GroupPanel';

/**
 * A half-written day survives a reload or an idle logout. Sessions are short by
 * design, and losing a note you were still typing because the gate timed out
 * would be a bad trade.
 */
const draftKey = (date: string) => `bm-draft-${date}`;

function readDraft(date: string): Record<string, HabitValue> | null {
  try {
    const raw = localStorage.getItem(draftKey(date));
    return raw ? (JSON.parse(raw) as Record<string, HabitValue>) : null;
  } catch {
    return null;
  }
}

function writeDraft(date: string, values: Record<string, HabitValue>): void {
  try {
    localStorage.setItem(draftKey(date), JSON.stringify(values));
  } catch {
    // Private mode, or storage full — the form still works, just without a net.
  }
}

function clearDraft(date: string): void {
  try {
    localStorage.removeItem(draftKey(date));
  } catch {
    // A stale draft is harmless.
  }
}

export function EntryForm({
  entry,
  groups,
  habits,
}: {
  entry: DayEntry;
  groups: HabitGroup[];
  habits: Habit[];
}) {
  const router = useRouter();

  const initial: Record<string, HabitValue> = {};
  for (const h of habits) {
    initial[h.key] = entry.values[h.key] ?? defaultValue(h);
  }

  const [values, setValues] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const restored = useRef(false);

  // Restore before the first edit, so a reload doesn't drop unsaved work.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const draft = readDraft(entry.date);
    if (!draft) return;

    // Reconcile against today's habits: a draft written before a habit was
    // removed must not resurrect it.
    const merged: Record<string, HabitValue> = {};
    for (const h of habits) {
      merged[h.key] = draft[h.key] ?? entry.values[h.key] ?? defaultValue(h);
    }

    if (JSON.stringify(merged) !== JSON.stringify(initial)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues(merged);
      setDirty(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.date]);

  const set = (key: string, value: HabitValue) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      writeDraft(entry.date, next);
      return next;
    });
    setDirty(true);
    setStatus('idle');
  };

  const onSave = () => {
    startTransition(async () => {
      const result = await saveDay(entry.date, values);
      if (result.ok) {
        clearDraft(entry.date);
        setDirty(false);
        setStatus('saved');
        setMessage('Uloženo');
        router.refresh();
      } else {
        setStatus('error');
        setMessage(result.error);
      }
    });
  };

  const filled = habits.filter((h) => isRecorded(h, values[h.key])).length;

  const prev = addDays(entry.date, -1);
  const next = addDays(entry.date, 1);
  const isToday = entry.date === today();

  const byGroup = groups
    .map((g) => ({ group: g, items: habits.filter((h) => h.groupId === g.id) }))
    .filter((g) => g.items.length > 0);
  const ungrouped = habits.filter((h) => h.groupId === null);

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="bm-card flex items-center justify-between gap-2 p-3">
        <Link href={`/day/${prev}`} aria-label="Předchozí den" className="bm-seg rounded-xl px-3.5 py-2 text-sm">←</Link>
        <div className="text-center">
          <div className="text-base font-semibold">
            {weekday(entry.date)} {formatCz(entry.date)}
          </div>
          <div className="text-xs text-[var(--muted)]">
            {isToday ? 'dnes' : entry.date} · {filled} z {habits.length} vyplněno
          </div>
        </div>
        <Link href={`/day/${next}`} aria-label="Další den" className="bm-seg rounded-xl px-3.5 py-2 text-sm">→</Link>
      </div>

      {habits.length === 0 ? (
        <div className="bm-card flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            Zatím nemáš žádné habity, takže není co zapisovat.
          </p>
          <Link
            href="/nastaveni"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-[#0e0f13]"
            style={{ background: 'var(--accent)' }}
          >
            Přidat první habit
          </Link>
        </div>
      ) : null}

      {byGroup.map(({ group, items }) => (
        <GroupPanel
          key={group.id}
          id={group.id}
          label={group.label}
          filled={items.filter((h) => isRecorded(h, values[h.key])).length}
          total={items.length}
        >
          {items.map((habit) => (
            <HabitControl
              key={habit.id}
              habit={habit}
              value={values[habit.key]}
              onChange={(v) => set(habit.key, v)}
            />
          ))}
        </GroupPanel>
      ))}

      {ungrouped.length > 0 ? (
        <GroupPanel
          id="none"
          label="Bez oddílu"
          filled={ungrouped.filter((h) => isRecorded(h, values[h.key])).length}
          total={ungrouped.length}
        >
          {ungrouped.map((habit) => (
            <HabitControl
              key={habit.id}
              habit={habit}
              value={values[habit.key]}
              onChange={(v) => set(habit.key, v)}
            />
          ))}
        </GroupPanel>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <span
            className="min-w-0 flex-1 truncate text-sm"
            style={{
              color:
                status === 'error' ? 'var(--loss)' : status === 'saved' ? 'var(--win)' : 'var(--muted)',
            }}
            role="status"
          >
            {status === 'idle' ? (dirty ? 'Neuložené změny' : 'Vše uloženo') : message}
          </span>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="cursor-pointer rounded-xl px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{
              background: dirty ? 'var(--accent)' : 'var(--panel-2)',
              color: dirty ? '#0e0f13' : 'var(--muted)',
            }}
          >
            {pending ? 'Ukládám…' : 'Uložit'}
          </button>
        </div>
      </div>
    </div>
  );
}
