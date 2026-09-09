'use client';

import type { ChoiceTone } from '@/lib/domain';

export type SegmentedOption<T> = { value: T; label: string; tone?: ChoiceTone };

const TONE_COLOR: Record<ChoiceTone, string> = {
  good: 'var(--win)',
  partial: 'var(--warn)',
  bad: 'var(--loss)',
};

/**
 * Segmented control. Options whose value is `null` act as the "clear" choice,
 * and clicking the active option also clears it when `clearable` is set —
 * that's the 3-way toggle cycling behaviour from the original artifact.
 */
export function Segmented<T extends string | number | null>({
  options,
  value,
  onChange,
  clearable = false,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  clearable?: boolean;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        const color = opt.tone ? TONE_COLOR[opt.tone] : undefined;
        return (
          <button
            key={String(opt.value)}
            type="button"
            data-active={active}
            aria-pressed={active}
            onClick={() =>
              onChange(clearable && active ? (null as T) : opt.value)
            }
            className="bm-seg flex-1 cursor-pointer rounded-xl px-3 py-2.5 text-sm"
            style={
              active && color
                ? { background: color, borderColor: color, color: '#0e0f13' }
                : undefined
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
