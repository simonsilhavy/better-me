import Link from 'next/link';
import { HistoryChart } from '@/components/HistoryChart';
import { getAll, getRange, getStats } from '@/lib/entries';
import { emptyEntry, type Entry, PROTAHOVANI_LABELS, SPRCHA_LABELS } from '@/lib/domain';
import { addDays, dateRange, formatCz, today, weekday } from '@/lib/date';

export const dynamic = 'force-dynamic';

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bm-card px-3 py-3 text-center">
      <div
        className="text-xl font-bold tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{label}</div>
    </div>
  );
}

function summary(e: Entry): string {
  const bits: string[] = [];
  if (e.kliky) bits.push(`${e.kliky} kliků`);
  if (e.drepy) bits.push(`${e.drepy} dřepů`);
  if (e.shake) bits.push(`${e.shake}× shake`);
  if (e.protahovani) bits.push(PROTAHOVANI_LABELS[e.protahovani].toLowerCase());
  if (e.sprcha !== 'none') bits.push(SPRCHA_LABELS[e.sprcha].toLowerCase());
  if (e.dpMinutes) bits.push(`DP ${e.dpMinutes} min`);
  if (e.instagram) bits.push('IG');
  if (e.resolveNow) bits.push('dořešeno');
  return bits.join(' · ');
}

export default async function HistoryPage() {
  const end = today();
  const start = addDays(end, -13);

  const [recent, all, stats] = await Promise.all([
    getRange(start, end),
    getAll(),
    getStats(),
  ]);

  const byDate = new Map(recent.map((e) => [e.date, e]));
  const chartData = dateRange(start, end).map(
    (d) => byDate.get(d) ?? emptyEntry(d),
  );

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Výhry" value={String(stats.wins)} color="var(--win)" />
        <Stat label="Prohry" value={String(stats.losses)} color="var(--loss)" />
        <Stat
          label={
            stats.streakKind === 'loss'
              ? 'Série proher'
              : stats.streakKind === 'win'
                ? 'Série výher'
                : 'Série'
          }
          value={String(stats.currentStreak)}
          color={
            stats.streakKind === 'win'
              ? 'var(--win)'
              : stats.streakKind === 'loss'
                ? 'var(--loss)'
                : undefined
          }
        />
        <Stat label="Zapsaných dní" value={String(stats.logged)} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Kliků celkem" value={String(stats.totalKliky)} />
        <Stat label="Dřepů celkem" value={String(stats.totalDrepy)} />
        <Stat
          label="DP hodin"
          value={(stats.totalDpMinutes / 60).toFixed(1)}
        />
      </div>

      <HistoryChart data={chartData} />

      <div className="bm-card overflow-hidden">
        <h2 className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
          Všechny záznamy ({all.length})
        </h2>
        {all.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            Zatím žádné záznamy. Začni{' '}
            <Link href="/" className="underline" style={{ color: 'var(--accent)' }}>
              dneškem
            </Link>
            .
          </p>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto divide-y divide-[var(--border)]">
            {all.map((e) => (
              <li key={e.date}>
                <Link
                  href={`/day/${e.date}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--panel-2)]"
                >
                  <span
                    className="h-9 w-1 shrink-0 rounded-full"
                    style={{
                      background:
                        e.verdict === 'win'
                          ? 'var(--win)'
                          : e.verdict === 'loss'
                            ? 'var(--loss)'
                            : 'var(--border)',
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {weekday(e.date)} {formatCz(e.date)}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                      {summary(e) || e.note || '—'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs tabular-nums text-[var(--muted)]">
                    {e.energyMorning}% → {e.energyUsed}%
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
