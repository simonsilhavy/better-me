'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveDay } from '@/app/actions';
import type { DayEntry, Habit, HabitGroup, HabitValue } from '@/lib/domain';
import { defaultValue, hasActivity, summarize } from '@/lib/domain';
import { addDays, formatCz, today, weekday } from '@/lib/date';
import { HabitControl } from './HabitControl';
import { GroupPanel } from './GroupPanel';

/**
 * A half-written day survives a reload or an idle logout. Sessions are short by
 * design, and losing a note you were still typing because the gate timed out
 * would be a bad trade.
 */
const draftKey = (date: string) => `bm-draft-${date}`;

type Draft = { values: Record<string, HabitValue>; answered: string[] };

function readDraft(date: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (!parsed || typeof parsed.values !== 'object' || parsed.values === null) return null;
    return { values: parsed.values, answered: parsed.answered ?? [] };
  } catch {
    return null;
  }
}

function writeDraft(date: string, draft: Draft): void {
  try {
    localStorage.setItem(draftKey(date), JSON.stringify(draft));
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
  // Seeded from what was actually recorded, then grown as you touch things.
  const [answered, setAnswered] = useState<Set<string>>(
    () => new Set(Object.keys(entry.values)),
  );
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const restored = useRef(false);

  /** Bumped on every edit so a finished save knows if it is still current. */
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const [dayDone, setDayDone] = useState(false);
  const wasDayComplete = useRef(false);

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
      merged[h.key] = draft.values[h.key] ?? entry.values[h.key] ?? defaultValue(h);
    }

    const draftAnswered = draft.answered.filter((k) => habits.some((h) => h.key === k));

    // A draft can differ from the saved day only in *what was answered* — an
    // answer of "Žádné" looks exactly like the untouched default. Comparing
    // values alone silently threw those away.
    const valuesDiffer = JSON.stringify(merged) !== JSON.stringify(initial);
    const answersDiffer = draftAnswered.some((k) => entry.values[k] === undefined);

    if (valuesDiffer || answersDiffer) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues(merged);
       
      setAnswered(new Set([...Object.keys(entry.values), ...draftAnswered]));
      setDirty(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.date]);

  const set = (habit: Habit, value: HabitValue) => {
    // null means "take that answer back": the control returns to its default
    // and the habit counts as unanswered again, exactly as before it was
    // touched. Saving then clears whatever was recorded for it.
    const clearing = value === null;
    const nextValue = clearing ? defaultValue(habit) : value;

    const nextAnswered = new Set(answered);
    if (clearing) nextAnswered.delete(habit.key);
    else nextAnswered.add(habit.key);

    setValues((prev) => {
      const next = { ...prev, [habit.key]: nextValue };
      // The draft carries which habits were answered, not just their values:
      // an answer that happens to equal the default is still an answer.
      writeDraft(entry.date, { values: next, answered: [...nextAnswered] });
      return next;
    });
    setAnswered(nextAnswered);
    setDirty(true);
    setStatus('idle');
    revision.current += 1;
  };

  // Answered habits are sent as they stand. An untouched control is not a
  // claim about the day, so it is left out — unless the day already held a
  // value for it, in which case null goes out to clear what was recorded.
  const buildPayload = (): Record<string, HabitValue> => {
    const payload: Record<string, HabitValue> = {};
    for (const h of habits) {
      if (answered.has(h.key)) payload[h.key] = values[h.key];
      else if (entry.values[h.key] !== undefined) payload[h.key] = null;
    }
    return payload;
  };

  const persist = async (rev: number, refresh: boolean) => {
    const result = await saveDay(entry.date, buildPayload());
    if (!result.ok) {
      setStatus('error');
      setMessage(result.error);
      return;
    }
    savedRevision.current = rev;
    // Anything typed while the save was in flight is still unsaved, so the
    // bar must keep saying so rather than claiming a clean slate.
    if (revision.current === rev) {
      clearDraft(entry.date);
      setDirty(false);
    }
    setStatus('saved');
    setMessage('Uloženo');
    if (refresh) router.refresh();
  };

  const onSave = () => {
    const rev = revision.current;
    startTransition(() => persist(rev, true));
  };

  /**
   * Autosave. Leaving the page mid-entry used to cost the day unless the draft
   * in the browser caught it; now a pause of a second and a half is enough for
   * the day to be on the server. The button stays — for the sense of a full
   * stop, and as the way to retry after an error.
   */
  useEffect(() => {
    if (!dirty || pending) return;
    const rev = revision.current;
    if (rev === savedRevision.current) return;

    const t = setTimeout(() => {
      startTransition(() => persist(rev, false));
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, answered, dirty, pending]);

  const filled = habits.filter((h) => answered.has(h.key)).length;
  const dayComplete = habits.length > 0 && filled === habits.length;

  // The day's single closing moment. It fires for having written the day down
  // — never for how the day went — which is the rule the whole app rests on.
  useEffect(() => {
    if (!dayComplete) {
      // No reset here on purpose: the banner runs out on its own timer, and
      // clearing it from the effect body only causes an extra render pass.
      wasDayComplete.current = false;
      return;
    }
    if (wasDayComplete.current) return;
    wasDayComplete.current = true;
    setDayDone(true);
    const t = setTimeout(() => setDayDone(false), 4200);
    return () => clearTimeout(t);
  }, [dayComplete]);

  /** Whether a group saw any activity at all — gates its emoji, nothing else. */
  const groupActive = (items: Habit[]) =>
    items.some((h) => answered.has(h.key) && hasActivity(h, values[h.key]));

  /** What a folded group leaves on screen, so nothing disappears out of sight. */
  const groupSummary = (items: Habit[]) =>
    items
      .filter((h) => answered.has(h.key))
      .map((h) => `${h.label} ${summarize(h, values[h.key])}`)
      .join(' · ');

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
        <Link href={`/den/${prev}`} aria-label="Předchozí den" className="bm-seg rounded-xl px-3.5 py-2 text-sm">←</Link>
        <div className="text-center">
          <div className="text-base font-semibold">
            {weekday(entry.date)} {formatCz(entry.date)}
          </div>
          <div className="text-xs text-[var(--muted)]">
            {isToday ? 'dnes' : entry.date} · {filled} z {habits.length} vyplněno
          </div>
        </div>
        <Link href={`/den/${next}`} aria-label="Další den" className="bm-seg rounded-xl px-3.5 py-2 text-sm">→</Link>
      </div>

      {/* Progress as a line rather than a sentence: length reads without being
          read, and it gives the form a visible end to walk towards. Sticky, so
          it stays in the corner of the eye while scrolling. */}
      {habits.length > 0 && (
        <div
          className="sticky top-0 z-20 -mx-4 h-[3px] bg-[var(--panel-2)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={habits.length}
          aria-valuenow={filled}
          aria-label={`Vyplněno ${filled} z ${habits.length}`}
        >
          <div
            className="h-full transition-[width,background-color] duration-300 ease-out"
            style={{
              width: `${(filled / habits.length) * 100}%`,
              background: dayComplete ? 'var(--win)' : 'var(--accent)',
            }}
          />
        </div>
      )}

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
          filled={items.filter((h) => answered.has(h.key)).length}
          total={items.length}
          emoji={group.config.emoji}
          active={groupActive(items)}
          summary={groupSummary(items)}
        >
          {items.map((habit) => (
            <HabitControl
              key={habit.id}
              habit={habit}
              value={values[habit.key]}
              date={entry.date}
              answered={answered.has(habit.key)}
              onChange={(v) => set(habit, v)}
            />
          ))}
        </GroupPanel>
      ))}

      {ungrouped.length > 0 ? (
        <GroupPanel
          id="none"
          label="Bez oddílu"
          filled={ungrouped.filter((h) => answered.has(h.key)).length}
          total={ungrouped.length}
          summary={groupSummary(ungrouped)}
        >
          {ungrouped.map((habit) => (
            <HabitControl
              key={habit.id}
              habit={habit}
              value={values[habit.key]}
              date={entry.date}
              answered={answered.has(habit.key)}
              onChange={(v) => set(habit, v)}
            />
          ))}
        </GroupPanel>
      ) : null}

      {dayDone && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[4.5rem] z-30 px-4">
          <div
            className="bm-rise mx-auto flex max-w-xl items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
            style={{
              background: 'color-mix(in srgb, var(--win) 16%, var(--panel))',
              border: '1px solid color-mix(in srgb, var(--win) 40%, var(--border))',
              color: 'var(--win)',
            }}
            role="status"
          >
            <span aria-hidden="true">🎯</span>
            <span>Dobrá práce. Máš to celé.</span>
          </div>
        </div>
      )}

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
