import Link from 'next/link';
import { formatCz } from '@/lib/date';

export type HeatDay = {
  date: string;
  /** 'win' | 'loss' when a verdict habit exists, else null. */
  verdict: 'win' | 'loss' | null;
  logged: boolean;
};

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

function weekdayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday first
}

/**
 * One square per day, laid out in weeks. Colour carries the verdict where there
 * is one; without a verdict habit it falls back to "was anything recorded",
 * which is the question the calendar can still answer.
 */
export function Heatmap({ days, hasVerdict }: { days: HeatDay[]; hasVerdict: boolean }) {
  if (days.length === 0) return null;

  const lead = weekdayIndex(days[0].date);
  const cells: (HeatDay | null)[] = [...Array(lead).fill(null), ...days];

  const fill = (day: HeatDay) => {
    if (hasVerdict) {
      if (day.verdict === 'win') return 'var(--win)';
      if (day.verdict === 'loss') return 'var(--loss)';
      return day.logged ? 'var(--border)' : 'transparent';
    }
    return day.logged ? 'var(--accent)' : 'transparent';
  };

  return (
    <div className="bm-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Kalendář</h2>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] text-[var(--muted)]">
            {w}
          </div>
        ))}

        {cells.map((day, i) =>
          day === null ? (
            <div key={`pad-${i}`} />
          ) : (
            <Link
              key={day.date}
              href={`/den/${day.date}`}
              title={`${formatCz(day.date)}${day.verdict ? ` — ${day.verdict === 'win' ? 'výhra' : 'prohra'}` : day.logged ? ' — zapsáno' : ' — nezapsáno'}`}
              className="aspect-square rounded-[4px] border border-[var(--border)] transition-transform hover:scale-110"
              style={{ background: fill(day) }}
            />
          ),
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
        {hasVerdict ? (
          <>
            <Legend color="var(--win)" label="výhra" />
            <Legend color="var(--loss)" label="prohra" />
            <Legend color="var(--border)" label="zapsáno bez verdiktu" />
          </>
        ) : (
          <Legend color="var(--accent)" label="zapsaný den" />
        )}
        <Legend color="transparent" label="nic" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-3 w-3 rounded-[3px] border border-[var(--border)]"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
