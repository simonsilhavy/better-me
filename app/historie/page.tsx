import Link from 'next/link';
import { Heatmap, type HeatDay } from '@/components/Heatmap';
import { PeriodPicker } from '@/components/PeriodPicker';
import { Sparkline } from '@/components/Sparkline';
import { getAllDays, getGroups, getHabits, getRange, getStats } from '@/lib/entries';
import { periodStats, previousWindow, formatValue, dayIsLogged } from '@/lib/history';
import { addDays, dateRange, formatCz, today, weekday } from '@/lib/date';
import type { DayEntry, Habit } from '@/lib/domain';

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

function Change({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-[11px] text-[var(--muted)]">nové</span>;
  const rounded = Math.round(pct);
  if (rounded === 0) return <span className="text-[11px] text-[var(--muted)]">beze změny</span>;
  const up = rounded > 0;
  return (
    <span className="text-[11px] tabular-nums" style={{ color: up ? 'var(--win)' : 'var(--loss)' }}>
      {up ? '↑' : '↓'} {Math.abs(rounded)} %
    </span>
  );
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ obdobi?: string }>;
}) {
  const { obdobi } = await searchParams;
  const period = Number(obdobi ?? 30);
  const days = Number.isFinite(period) && period > 0 ? period : 0;

  const end = today();
  const [allDays, habits, groups, stats] = await Promise.all([
    getAllDays(),
    getHabits(true),
    getGroups(),
    getStats(),
  ]);

  const earliest = allDays.length > 0 ? allDays[allDays.length - 1].date : end;
  const start = days > 0 ? addDays(end, -(days - 1)) : earliest;

  const prev = previousWindow(start, end);
  const [current, before] = await Promise.all([
    getRange(start, end),
    getRange(prev.from, prev.to),
  ]);

  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  const dates = dateRange(start, end);
  const byDate = new Map<string, DayEntry>(current.map((d) => [d.date, d]));

  const perHabit = periodStats([...active, ...archived], current, before, dates);
  const statsByKey = new Map(perHabit.map((s) => [s.habit.key, s]));

  const verdictHabit = stats.verdict?.habit;
  const winValue = verdictHabit?.config.options?.[0]?.value;

  const heat: HeatDay[] = dates.map((d) => {
    const day = byDate.get(d);
    const raw = verdictHabit ? day?.values[verdictHabit.key] : undefined;
    return {
      date: d,
      verdict: raw === undefined || raw === null ? null : raw === winValue ? 'win' : 'loss',
      logged: dayIsLogged(day, active),
    };
  });

  const loggedInPeriod = heat.filter((h) => h.logged).length;

  const sections: { label: string; items: Habit[] }[] = [
    ...groups.map((g) => ({ label: g.label, items: active.filter((h) => h.groupId === g.id) })),
    { label: 'Bez oddílu', items: active.filter((h) => h.groupId === null) },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="flex flex-col gap-4 pb-12">
      <PeriodPicker current={days} />

      {/* The verdict habit is removable, so these tiles have to disappear
          rather than render zeros that read as real results. */}
      {stats.verdict ? (
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Výhry" value={String(stats.verdict.wins)} color="var(--win)" />
          <Stat label="Prohry" value={String(stats.verdict.losses)} color="var(--loss)" />
          <Stat
            label={stats.verdict.streakKind === winValue ? 'Série výher' : 'Série proher'}
            value={String(stats.verdict.streak)}
            color={stats.verdict.streakKind === winValue ? 'var(--win)' : 'var(--loss)'}
          />
          <Stat label="Zapsáno" value={`${loggedInPeriod}/${dates.length}`} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Zapsaných dní v období" value={`${loggedInPeriod}/${dates.length}`} />
          <Stat label="Sledovaných habitů" value={String(active.length)} />
        </div>
      )}

      <Heatmap days={heat} hasVerdict={Boolean(verdictHabit)} />

      {sections.map((section) => (
        <section key={section.label} className="flex flex-col gap-2">
          <h2 className="px-1 pt-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {section.label}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {section.items.map((habit) => {
              const s = statsByKey.get(habit.key);
              if (!s) return null;
              return (
                <Link
                  key={habit.id}
                  href={`/historie/${habit.key}?obdobi=${days}`}
                  className="bm-card flex flex-col gap-2 p-3 transition-colors hover:bg-[var(--panel-2)]"
                >
                  <span className="truncate text-xs text-[var(--muted)]">{habit.label}</span>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold tabular-nums">{formatValue(s)}</span>
                    <Change pct={s.changePct} />
                  </span>
                  <Sparkline values={s.spark} color="var(--accent)" />
                  <span className="text-[10px] text-[var(--muted)]">
                    {s.recordedDays} z {dates.length} dní
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {archived.length > 0 ? (
        <details className="bm-card p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Už netrackuju ({archived.length})
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {archived.map((habit) => {
              const s = statsByKey.get(habit.key);
              if (!s) return null;
              return (
                <Link
                  key={habit.id}
                  href={`/historie/${habit.key}?obdobi=${days}`}
                  className="bm-card p-3 opacity-70"
                >
                  <span className="block truncate text-xs text-[var(--muted)]">{habit.label}</span>
                  <span className="mt-1 block text-base font-semibold tabular-nums">{formatValue(s)}</span>
                </Link>
              );
            })}
          </div>
        </details>
      ) : null}

      <div className="bm-card overflow-hidden">
        <h2 className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
          Zapsané dny ({allDays.length})
        </h2>
        {allDays.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            Zatím žádné záznamy. Začni{' '}
            <Link href="/" className="underline" style={{ color: 'var(--accent)' }}>dneškem</Link>.
          </p>
        ) : (
          <ul className="max-h-[50vh] divide-y divide-[var(--border)] overflow-y-auto">
            {allDays.map((day) => {
              const raw = verdictHabit ? day.values[verdictHabit.key] : undefined;
              const filled = active.filter((h) => day.values[h.key] !== undefined).length;
              return (
                <li key={day.date}>
                  <Link href={`/den/${day.date}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--panel-2)]">
                    <span
                      className="h-9 w-1 shrink-0 rounded-full"
                      style={{
                        background:
                          raw === undefined || raw === null
                            ? 'var(--border)'
                            : raw === winValue ? 'var(--win)' : 'var(--loss)',
                      }}
                    />
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      {weekday(day.date)} {formatCz(day.date)}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                      {filled}/{active.length}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
