'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveEntry } from '@/app/actions';
import {
  type Entry,
  type Protahovani,
  type Sprcha,
  type Verdict,
  PROTAHOVANI_LABELS,
  SLIDERS,
  SPRCHA_LABELS,
} from '@/lib/domain';
import { addDays, formatCz, today, weekday } from '@/lib/date';
import { Field } from './Field';
import { Slider } from './Slider';
import { Segmented } from './Segmented';
import { Toggle } from './Toggle';

function formatMinutes(min: number): string {
  if (min === 0) return '0 min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * A half-written day survives a reload or an idle logout. Sessions are short by
 * design, and losing a note you were still typing because the gate timed out
 * would be a bad trade.
 */
const draftKey = (date: string) => `bm-draft-${date}`;

function readDraft(date: string): Entry | null {
  try {
    const raw = localStorage.getItem(draftKey(date));
    return raw ? (JSON.parse(raw) as Entry) : null;
  } catch {
    return null;
  }
}

function writeDraft(entry: Entry): void {
  try {
    localStorage.setItem(draftKey(entry.date), JSON.stringify(entry));
  } catch {
    // Private mode, or storage full — the form still works, just without a net.
  }
}

function clearDraft(date: string): void {
  try {
    localStorage.removeItem(draftKey(date));
  } catch {
    // Nothing to do; a stale draft is harmless.
  }
}

export function EntryForm({ initial }: { initial: Entry }) {
  const router = useRouter();
  const [entry, setEntry] = useState<Entry>(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const restored = useRef(false);

  // Restore before the first edit, so a reload doesn't drop unsaved work.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const draft = readDraft(initial.date);
    if (draft && JSON.stringify(draft) !== JSON.stringify(initial)) {
      // Reading localStorage is exactly the external-system sync an effect is
      // for, and it can't happen during render without breaking hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntry({ ...draft, date: initial.date });
      setDirty(true);
    }
  }, [initial]);

  const set = <K extends keyof Entry>(key: K, value: Entry[K]) => {
    setEntry((prev) => {
      const next = { ...prev, [key]: value };
      writeDraft(next);
      return next;
    });
    setDirty(true);
    setStatus('idle');
  };

  const onSave = () => {
    startTransition(async () => {
      const result = await saveEntry(entry);
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

  const prev = addDays(entry.date, -1);
  const next = addDays(entry.date, 1);
  const isToday = entry.date === today();
  const isFuture = entry.date > today();

  return (
    <div className="flex flex-col gap-4 pb-28">
      {/* date nav */}
      <div className="bm-card flex items-center justify-between gap-2 p-3">
        <Link
          href={`/day/${prev}`}
          aria-label="Předchozí den"
          className="bm-seg rounded-xl px-3.5 py-2 text-sm"
        >
          ←
        </Link>
        <div className="text-center">
          <div className="text-base font-semibold">
            {weekday(entry.date)} {formatCz(entry.date)}
          </div>
          <div className="text-xs text-[var(--muted)]">
            {isToday ? 'dnes' : isFuture ? 'budoucnost' : entry.date}
          </div>
        </div>
        <Link
          href={`/day/${next}`}
          aria-label="Další den"
          className="bm-seg rounded-xl px-3.5 py-2 text-sm"
        >
          →
        </Link>
      </div>

      <Field
        label="Energie ráno"
        value={`${entry.energyMorning} %`}
      >
        <Slider
          ariaLabel="Energie ráno"
          value={entry.energyMorning}
          {...SLIDERS.energyMorning}
          onChange={(v) => set('energyMorning', v)}
        />
      </Field>

      <Field label="Energie využitá" value={`${entry.energyUsed} %`}>
        <Slider
          ariaLabel="Energie využitá"
          value={entry.energyUsed}
          {...SLIDERS.energyUsed}
          color="var(--win)"
          onChange={(v) => set('energyUsed', v)}
        />
      </Field>

      <Field label="Kliky" value={String(entry.kliky)}>
        <Slider
          ariaLabel="Kliky"
          value={entry.kliky}
          {...SLIDERS.kliky}
          onChange={(v) => set('kliky', v)}
        />
      </Field>

      <Field label="Dřepy" value={String(entry.drepy)}>
        <Slider
          ariaLabel="Dřepy"
          value={entry.drepy}
          {...SLIDERS.drepy}
          onChange={(v) => set('drepy', v)}
        />
      </Field>

      <Field label="Shake" value={String(entry.shake)}>
        <Segmented<number>
          value={entry.shake}
          onChange={(v) => set('shake', v ?? 0)}
          options={[
            { value: 0, label: '0' },
            { value: 1, label: '1' },
            { value: 2, label: '2' },
          ]}
        />
      </Field>

      <Field label="Protahování" hint="klikni znovu pro zrušení">
        <Segmented<Protahovani | null>
          value={entry.protahovani}
          clearable
          onChange={(v) => set('protahovani', v)}
          options={(
            Object.keys(PROTAHOVANI_LABELS) as Protahovani[]
          ).map((v) => ({ value: v, label: PROTAHOVANI_LABELS[v] }))}
        />
      </Field>

      <Field label="Sprcha">
        <Segmented<Sprcha>
          value={entry.sprcha}
          onChange={(v) => set('sprcha', v ?? 'none')}
          options={(Object.keys(SPRCHA_LABELS) as Sprcha[]).map((v) => ({
            value: v,
            label: SPRCHA_LABELS[v],
          }))}
        />
      </Field>

      <Field label="Daňová Pohoda" value={formatMinutes(entry.dpMinutes)}>
        <Slider
          ariaLabel="Daňová Pohoda minuty"
          value={entry.dpMinutes}
          {...SLIDERS.dpMinutes}
          onChange={(v) => set('dpMinutes', v)}
        />
      </Field>

      <Toggle
        label="Instagram"
        hint="pravidlo drženo do 17:00"
        checked={entry.instagram}
        onChange={(v) => set('instagram', v)}
      />

      <Toggle
        label="Co otevřu, dořeším"
        checked={entry.resolveNow}
        onChange={(v) => set('resolveNow', v)}
      />

      <Field label="Verdikt" hint="klikni znovu pro zrušení">
        <Segmented<Verdict | null>
          value={entry.verdict}
          clearable
          activeColor={entry.verdict === 'win' ? 'var(--win)' : 'var(--loss)'}
          onChange={(v) => set('verdict', v)}
          options={[
            { value: 'win', label: 'Výhra' },
            { value: 'loss', label: 'Prohra' },
          ]}
        />
      </Field>

      <Field label="Poznámka">
        <textarea
          value={entry.note}
          onChange={(e) => set('note', e.target.value)}
          rows={4}
          placeholder="Jak to dneska šlo…"
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
        />
      </Field>

      {/* sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <span
            className="min-w-0 flex-1 truncate text-sm"
            style={{
              color:
                status === 'error'
                  ? 'var(--loss)'
                  : status === 'saved'
                    ? 'var(--win)'
                    : 'var(--muted)',
            }}
            role="status"
          >
            {status === 'idle'
              ? dirty
                ? 'Neuložené změny'
                : 'Vše uloženo'
              : message}
          </span>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="cursor-pointer rounded-xl px-6 py-2.5 text-sm font-semibold text-[#0e0f13] transition-opacity disabled:opacity-60"
            style={{ background: dirty ? 'var(--accent)' : 'var(--panel-2)', color: dirty ? '#0e0f13' : 'var(--muted)' }}
          >
            {pending ? 'Ukládám…' : 'Uložit'}
          </button>
        </div>
      </div>
    </div>
  );
}
