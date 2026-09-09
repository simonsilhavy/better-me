export function Field({
  label,
  hint,
  value,
  onClear,
  children,
}: {
  label: string;
  hint?: string;
  value?: string;
  /** Present once the habit holds an answer, to take that answer back. */
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bm-card p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <span className="text-sm font-medium text-[var(--text)]">{label}</span>
          {hint ? (
            <span className="ml-2 text-xs text-[var(--muted)]">{hint}</span>
          ) : null}
        </div>
        <span className="flex items-center gap-2">
          {value ? (
            <span className="text-sm font-semibold tabular-nums text-[var(--text)]">
              {value}
            </span>
          ) : null}
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              aria-label={`Zrušit zápis: ${label}`}
              title="Zrušit zápis"
              className="bm-seg bm-press cursor-pointer rounded-md px-1.5 text-xs leading-5"
            >
              ×
            </button>
          ) : null}
        </span>
      </div>
      {children}
    </div>
  );
}
