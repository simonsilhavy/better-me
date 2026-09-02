'use client';

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="bm-card flex w-full cursor-pointer items-center justify-between gap-4 p-4 text-left"
    >
      <span>
        <span className="block text-sm font-medium text-[var(--text)]">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-xs text-[var(--muted)]">{hint}</span>
        ) : null}
      </span>
      <span
        className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? 'var(--win)' : 'var(--track)' }}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
          style={{ left: checked ? '1.5rem' : '0.25rem' }}
        />
      </span>
    </button>
  );
}
