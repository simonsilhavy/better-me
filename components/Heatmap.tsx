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
 * One square per day, laid out in weeks.
 *
 * Colour answers "did I write it down", never "did it go well". That is the
 * app's governing rule: a day recorded honestly must never look worse than a
 * day left blank, or the calendar quietly pays you to stay silent about bad
 * days. The verdict still shows — as a small dot in the corner and in the
 * tooltip — but it never drives the square itself.
 */
export function Heatmap({ days, hasVerdict }: { days: HeatDay[]; hasVerdict: boolean }) {
  if (days.length === 0) return null;

  const lead = weekdayIndex(days[0].date);
  const cells: (HeatDay | null)[] = [...Array(lead).fill(null), ...days];

  const title = (day: HeatDay) => {
    const head = `${formatCz(day.date)} — ${day.logged ? 'zapsáno' : 'nezapsáno'}`;
    if (!day.verdict) return head;
    return `${head}, ${day.verdict === 'win' ? 'výhra' : 'prohra'}`;
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
              title={title(day)}
              className="relative aspect-square rounded-[4px] border border-[var(--border)] transition-transform hover:scale-110"
              style={{ background: day.logged ? 'var(--accent)' : 'transparent' }}
            >
              {day.verdict && (
                <span
                  aria-hidden
                  className="absolute bottom-[2px] right-[2px] h-[5px] w-[5px] rounded-full"
                  style={{
                    background: day.verdict === 'win' ? 'var(--win)' : 'var(--loss)',
                  }}
                />
              )}
            </Link>
          ),
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
        <Legend color="var(--accent)" label="zapsaný den" />
        <Legend color="transparent" label="nezapsáno" />
        {hasVerdict && (
          <>
            <Legend color="var(--win)" label="výhra" dot />
            <Legend color="var(--loss)" label="prohra" dot />
          </>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label, dot }: { color: string; label: string; dot?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={
          dot
            ? 'h-[6px] w-[6px] rounded-full'
            : 'h-3 w-3 rounded-[3px] border border-[var(--border)]'
        }
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
