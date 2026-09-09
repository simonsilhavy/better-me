'use client';

import type { Habit, HabitValue } from '@/lib/domain';
import { questionFor, retroValue } from '@/lib/retro';
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

/** Renders whichever control this habit's kind calls for. */
export function HabitControl({
  habit,
  value,
  date,
  onChange,
  answered = true,
}: {
  habit: Habit;
  value: HabitValue;
  /** Which day is being written — the retrospective question follows it. */
  date: string;
  onChange: (next: HabitValue) => void;
  /**
   * Whether this habit holds an answer rather than its default. Colour means
   * "this is how the day went", so an untouched control stays neutral — a
   * screen of red every morning would be reporting nothing.
   */
  answered?: boolean;
}) {
  const cfg = habit.config;

  switch (habit.kind) {
    case 'scale':
    case 'counter':
    case 'duration': {
      const n = typeof value === 'number' ? value : (cfg.min ?? 0);
      const display =
        habit.kind === 'duration'
          ? formatMinutes(n)
          : `${n}${cfg.unit ? ` ${cfg.unit}` : ''}`;

      return (
        <Field
          label={habit.label}
          hint={cfg.hint}
          value={display}
          onClear={answered ? () => onChange(null) : undefined}
        >
          <Slider
            ariaLabel={habit.label}
            value={n}
            min={cfg.min ?? 0}
            max={cfg.max ?? 100}
            step={cfg.step && cfg.step > 0 ? cfg.step : 1}
            color={habit.key === 'energyUsed' ? 'var(--win)' : undefined}
            onChange={onChange}
          />
        </Field>
      );
    }

    case 'boolean':
      return (
        <Toggle
          label={habit.label}
          hint={cfg.hint}
          checked={value === true}
          onChange={onChange}
        />
      );

    case 'choice': {
      const current = typeof value === 'string' ? value : null;

      return (
        <Field label={habit.label} hint={cfg.hint}>
          <Segmented<string | null>
            value={current}
            toned={answered}
            /* Only an answer can be taken back. The default option looks
               selected on an untouched day, so treating a tap on it as a clear
               would make that option impossible to choose. */
            clearable={answered}
            onChange={(next) => onChange(next)}
            options={(cfg.options ?? []).map((o) => ({
              value: o.value,
              label: o.label,
              tone: o.tone,
            }))}
          />
        </Field>
      );
    }

    case 'text': {
      const box = (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          maxLength={cfg.maxLength ?? 4000}
          placeholder={cfg.placeholder ?? ''}
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
        />
      );

      // The prompt inside the box already says what to write; a label above it
      // would only repeat itself.
      return cfg.hideLabel ? <div className="bm-card p-4">{box}</div> : (
        <Field label={habit.label} hint={cfg.hint}>{box}</Field>
      );
    }

    case 'retro': {
      const current = retroValue(value);
      const question = questionFor(habit, date, current);

      return (
        <div className="bm-card flex flex-col">
          {/* Top half asks, bottom half answers. */}
          <div className="border-b border-[var(--border)] p-4">
            {!cfg.hideLabel && (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {habit.label}
              </p>
            )}
            <p className="text-sm font-medium text-[var(--text)]">
              {question?.text ?? 'Zatím tu není žádná otázka.'}
            </p>
          </div>
          <div className="p-4">
            <textarea
              value={current.a}
              onChange={(e) => onChange({ q: question?.id ?? current.q, a: e.target.value })}
              rows={4}
              maxLength={cfg.maxLength ?? 4000}
              placeholder="Napiš, co tě k tomu napadá…"
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>
      );
    }
  }
}
