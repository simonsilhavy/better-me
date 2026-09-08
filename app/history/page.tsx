import Link from 'next/link';
import { HistoryChart, type ChartPoint } from '@/components/HistoryChart';
import { getAllDays, getGroups, getHabits, getRange, getStats } from '@/lib/entries';
import type { DayEntry, Habit } from '@/lib/domain';
import { addDays, dateRange, formatCz, today, weekday } from '@/lib/date';

export const dynamic = 'force-dynamic';

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bm-card px-3 py-3 text-center">
      <div className="text-xl font-bold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{label}</div>
    </div>
  );
}

function summary(day: DayEntry, habits: Habit[]): string {
  const bits: string[] = [];
  for (const h of habits) {
    const v = day.values[h.key];
    if (v === undefined || v === null || v === '' || v === false) continue;
    if (h.role === 'note') continue;
    if (h.kind === 'boolean') bits.push(h.label);
    else if (h.kind === 'choice') {
      const opt = (h.config.options ?? []).find((o) => o.value === v);
      bits.push(`${h.label.toLowerCase()}: ${opt?.label ?? v}`);
    } else bits.push(`${v}${h.config.unit ?? ''} ${h.label.toLowerCase()}`);
  }
  return bits.join(' · ');
}

export default async function HistoryPage() {
  const end = today();
  const start = addDays(end, -13);

  const [recent, all, stats, habits, groups] = await Promise.all([
    getRange(start, end),
    getAllDays(),
    getStats(),
    getHabits(true),
    getGroups(),
  ]);

  const active = habits.filter((h) => !h.archived);
  const byDate = new Map(recent.map((d) => [d.date, d]));
  const chartData: ChartPoint[] = dateRange(start, end).map((d) => {
    const day = byDate.get(d);
    const point: ChartPoint = { date: d };
    for (const h of active) {
      const v = day?.values[h.key];
      point[h.key] = typeof v === 'number' ? v : 0;
    }
    return point;
  });

  const verdictHabit = stats.verdict?.habit;
  const winValue = verdictHabit?.config.options?.[0]?.value;
  const noteHabit = habits.find((h) => h.role === 'note');

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* The verdict habit can be deleted, so these tiles have to disappear
          cleanly rather than render zeros that look like real results. */}
      {stats.verdict ? (
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Výhry" value={String(stats.verdict.wins)} color="var(--win)" />
          <Stat label="Prohry" value={String(stats.verdict.losses)} color="var(--loss)" />
          <Stat
            label={stats.verdict.streakKind === winValue ? 'Série výher' : 'Série proher'}
            value={String(stats.verdict.streak)}
            color={stats.verdict.streakKind === winValue ? 'var(--win)' : 'var(--loss)'}
          />
          <Stat label="Zapsaných dní" value={String(stats.loggedDays)} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Zapsaných dní" value={String(stats.loggedDays)} />
          <Stat label="Sledovaných habitů" value={String(active.length)} />
        </div>
      )}

      <HistoryChart data={chartData} habits={active} />

      <div className="bm-card overflow-hidden">
        <h2 className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
          Všechny záznamy ({all.length})
        </h2>
        {all.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            Zatím žádné záznamy. Začni{' '}
            <Link href="/" className="underline" style={{ color: 'var(--accent)' }}>dneškem</Link>.
          </p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-[var(--border)] overflow-y-auto">
            {all.map((day) => {
              const verdict = verdictHabit ? day.values[verdictHabit.key] : undefined;
              const note = noteHabit ? day.values[noteHabit.key] : undefined;
              return (
                <li key={day.date}>
                  <Link
                    href={`/day/${day.date}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--panel-2)]"
                  >
                    <span
                      className="h-9 w-1 shrink-0 rounded-full"
                      style={{
                        background:
                          verdict === undefined || verdict === null
                            ? 'var(--border)'
                            : verdict === winValue
                              ? 'var(--win)'
                              : 'var(--loss)',
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {weekday(day.date)} {formatCz(day.date)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                        {summary(day, active) || (typeof note === 'string' ? note : '') || '—'}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="px-1 text-xs text-[var(--muted)]">
        {groups.length} oddílů · {active.length} aktivních habitů
      </p>
    </div>
  );
}
