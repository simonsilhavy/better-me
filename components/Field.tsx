export function Field({
  label,
  hint,
  value,
  children,
}: {
  label: string;
  hint?: string;
  value?: string;
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
        {value ? (
          <span className="text-sm font-semibold tabular-nums text-[var(--text)]">
            {value}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
