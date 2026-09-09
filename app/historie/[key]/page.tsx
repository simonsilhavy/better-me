import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HistoryChart } from '@/components/HistoryChart';
import { PeriodPicker } from '@/components/PeriodPicker';
import { getAllDays, getHabits, getRange } from '@/lib/entries';
import { formatValue, metricFor, periodStats, previousWindow } from '@/lib/history';
import { addDays, dateRange, formatCz, today, weekday } from '@/lib/date';
import { isRecorded } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export default async function HabitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ obdobi?: string }>;
}) {
  const { key } = await params;
  const { obdobi } = await searchParams;
  const period = Number(obdobi ?? 30);
  const days = Number.isFinite(period) && period > 0 ? period : 0;

  const habits = await getHabits(true);
  const habit = habits.find((h) => h.key === key);
  if (!habit) notFound();

  const end = today();
  const all = await getAllDays();
  const earliest = all.length > 0 ? all[all.length - 1].date : end;
  const start = days > 0 ? addDays(end, -(days - 1)) : earliest;

  const prev = previousWindow(start, end);
  const [current, before] = await Promise.all([
    getRange(start, end),
    getRange(prev.from, prev.to),
  ]);

  const dates = dateRange(start, end);
  const [stats] = periodStats([habit], current, before, dates);
  const numericKind = ['scale', 'counter', 'duration'].includes(habit.kind);

  const chartData = dates.map((d) => {
    const day = current.find((c) => c.date === d);
    const raw = day?.values[habit.key];
    return { date: d, [habit.key]: typeof raw === 'number' ? raw : 0 };
  });

  const recorded = current
    .filter((d) => {
      const v = d.values[habit.key];
      return v !== undefined && isRecorded(habit, v);
    })
    .reverse();

  const label = (v: unknown) => {
    if (habit.kind === 'choice') {
      return (habit.config.options ?? []).find((o) => o.value === v)?.label ?? String(v);
    }
    if (habit.kind === 'boolean') return v ? 'ano' : 'ne';
    return String(v);
  };

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div className="bm-card p-4">
        <Link href={`/historie?obdobi=${days}`} className="text-xs" style={{ color: 'var(--accent)' }}>
          ← Historie
        </Link>
        <h1 className="mt-1 text-lg font-semibold">{habit.label}</h1>
        <p className="text-xs text-[var(--muted)]">
          {habit.archived ? 'už netrackuješ · ' : ''}
          {metricFor(habit) === 'sum' ? 'součet' : metricFor(habit) === 'avg' ? 'průměr' : 'počet dní'} za období
        </p>
        <p className="mt-2 text-2xl font-bold tabular-nums">{formatValue(stats)}</p>
        <p className="text-xs text-[var(--muted)]">
          zapsáno {stats.recordedDays} z {dates.length} dní
        </p>
      </div>

      <PeriodPicker current={days} />

      {numericKind ? (
        <HistoryChart data={chartData} habits={[habit]} title={`Průběh — ${habit.label}`} />
      ) : null}

      <div className="bm-card overflow-hidden">
        <h2 className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
          Zapsané dny ({recorded.length})
        </h2>
        {recorded.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            V tomhle období nic zapsaného.
          </p>
        ) : (
          <ul className="max-h-[50vh] divide-y divide-[var(--border)] overflow-y-auto">
            {recorded.map((day) => (
              <li key={day.date}>
                <Link href={`/den/${day.date}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--panel-2)]">
                  <span className="text-sm">{weekday(day.date)} {formatCz(day.date)}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {label(day.values[habit.key])}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
