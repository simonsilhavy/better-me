'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Habit, HabitConfig, HabitGroup, HabitKind, HabitValue } from '@/lib/domain';
import { defaultValue } from '@/lib/domain';
import { HabitControl } from '@/components/HabitControl';
import { today } from '@/lib/date';
import { addHabit } from './actions';

/**
 * Kinds described by what they do, not by their name in the schema — you pick
 * "posuvník s počtem", not "counter".
 */
const KINDS: { kind: HabitKind; label: string; hint: string; config: HabitConfig }[] = [
  { kind: 'counter', label: 'Počet', hint: 'kolikrát, kolik kusů', config: { min: 0, max: 100, step: 1 } },
  { kind: 'scale', label: 'Míra v %', hint: 'od nuly do sta', config: { min: 0, max: 100, step: 10, unit: '%' } },
  { kind: 'duration', label: 'Čas', hint: 'minuty, zobrazí se v hodinách', config: { min: 0, max: 480, step: 15 } },
  { kind: 'boolean', label: 'Ano / ne', hint: 'přepínač', config: {} },
  {
    kind: 'choice', label: 'Volba', hint: 'několik možností',
    config: { clearable: true, options: [{ value: 'a', label: 'Málo' }, { value: 'b', label: 'Středně' }, { value: 'c', label: 'Hodně' }] },
  },
  { kind: 'text', label: 'Text', hint: 'volný zápis', config: { maxLength: 2000, placeholder: 'Napiš…' } },
];

/** One tap instead of a blank form. */
const PRESETS: { label: string; kind: HabitKind; config: HabitConfig }[] = [
  { label: 'Voda', kind: 'counter', config: { min: 0, max: 15, step: 1, unit: 'sklenic' } },
  { label: 'Spánek', kind: 'duration', config: { min: 0, max: 720, step: 15 } },
  { label: 'Čtení', kind: 'duration', config: { min: 0, max: 240, step: 10 } },
  { label: 'Meditace', kind: 'boolean', config: {} },
  { label: 'Kroky', kind: 'counter', config: { min: 0, max: 30000, step: 500 } },
];

export function HabitCreator({ groups }: { groups: HabitGroup[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<HabitKind>('counter');
  const [config, setConfig] = useState<HabitConfig>(KINDS[0].config);
  const [groupId, setGroupId] = useState<number | null>(groups[0]?.id ?? null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const [previewValue, setPreviewValue] = useState<HabitValue>(0);

  const pickKind = (k: HabitKind) => {
    const spec = KINDS.find((x) => x.kind === k)!;
    setKind(k);
    setConfig(spec.config);
    setPreviewValue(defaultValue({ kind: k, config: spec.config } as Habit));
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setLabel(p.label);
    setKind(p.kind);
    setConfig(p.config);
    setPreviewValue(defaultValue({ kind: p.kind, config: p.config } as Habit));
  };

  const preview: Habit = {
    id: -1, groupId, key: 'preview', label: label.trim() || 'Nový habit',
    kind, config, role: null, position: 0, archived: false,
  };

  const submit = () => {
    setError('');
    startTransition(async () => {
      const result = await addHabit({ label, kind, groupId, config });
      if (result.ok) {
        setOpen(false);
        setLabel('');
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bm-card cursor-pointer p-4 text-sm font-medium"
        style={{ color: 'var(--accent)' }}
      >
        + Přidat habit
      </button>
    );
  }

  return (
    <div className="bm-card flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Nový habit</h3>
        <button type="button" onClick={() => setOpen(false)} className="bm-seg rounded-lg px-2.5 py-1 text-xs">
          Zavřít
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-[var(--muted)]">Předloha</span>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => applyPreset(p)} className="bm-seg cursor-pointer rounded-lg px-2.5 py-1 text-xs">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Název habitu"
        maxLength={60}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
      />

      <div className="flex flex-col gap-2">
        <span className="text-xs text-[var(--muted)]">Typ</span>
        <div className="grid grid-cols-2 gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              data-active={kind === k.kind}
              onClick={() => pickKind(k.kind)}
              className="bm-seg cursor-pointer rounded-lg px-2.5 py-2 text-left text-xs"
            >
              <span className="block font-medium">{k.label}</span>
              <span className="block opacity-70">{k.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs text-[var(--muted)]">Oddíl</span>
        <select
          value={groupId ?? ''}
          onChange={(e) => setGroupId(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-sm text-[var(--text)]"
        >
          {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          <option value="">Bez oddílu</option>
        </select>
      </label>

      {/* You tap the real control before committing to it. */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-[var(--muted)]">Náhled — takhle to budeš vyplňovat</span>
        <HabitControl habit={preview} value={previewValue} date={today()} onChange={setPreviewValue} />
      </div>

      {error ? <p className="text-sm" style={{ color: 'var(--loss)' }} role="alert">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending || label.trim() === ''}
        className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-[#0e0f13] disabled:opacity-50"
        style={{ background: 'var(--accent)' }}
      >
        {pending ? 'Ukládám…' : 'Vytvořit habit'}
      </button>
    </div>
  );
}
