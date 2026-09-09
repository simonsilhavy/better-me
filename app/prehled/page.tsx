import Link from 'next/link';
import {
  MIN_GROUP_DAYS,
  MIN_TOTAL_DAYS,
  countLoggedDays,
  getDrivers,
  getWeekdayStats,
} from '@/lib/insights';
import { czDays } from '@/lib/date';

export const dynamic = 'force-dynamic';

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const WINDOW = 90;

export default async function InsightsPage() {
  const logged = await countLoggedDays();

  // Both views are shaped by chance until there is a month or so behind them.
  // Showing them early would teach the wrong lesson from three good Tuesdays.
  if (logged < MIN_TOTAL_DAYS) {
    return (
      <div className="flex flex-col gap-4 pb-12">
        <div className="bm-card p-6">
          <h1 className="text-base font-semibold">Přehled</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Zatím máš zapsaných {czDays(logged)}. Tenhle přehled se zapne po{' '}
            {MIN_TOTAL_DAYS} dnech — dřív by z pár náhodných úterků dělal pravidla.
          </p>
          <div
            className="mt-4 h-[3px] overflow-hidden rounded-full"
            style={{ background: 'var(--panel-2)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (logged / MIN_TOTAL_DAYS) * 100)}%`,
                background: 'var(--accent)',
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            {logged}/{MIN_TOTAL_DAYS}
          </p>
        </div>
      </div>
    );
  }

  const [week, drivers] = await Promise.all([getWeekdayStats(WINDOW), getDrivers(WINDOW)]);

  const maxDriver = Math.max(1, ...drivers.drivers.filter((d) => !d.thin).map((d) => Math.abs(d.points)));
  const solid = drivers.drivers.filter((d) => !d.thin);
  const thin = drivers.drivers.filter((d) => d.thin);

  const weekMax = Math.max(
    1,
    ...week.stats.map((s) => (week.hasVerdict && s.winRate !== null ? s.winRate : s.loggedDays)),
  );

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div className="bm-card p-4">
        <h1 className="text-base font-semibold">Přehled</h1>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Posledních {WINDOW} dní. Čísla ukazují, co spolu souvisí — ne co co
          způsobuje.
        </p>
      </div>

      {/* ------------------------------------------------ co táhne výhru */}
      <section className="bm-card p-4">
        <h2 className="text-sm font-semibold">Co táhne výhru</h2>
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          Podíl výher ve dnech, kdy jsi habit dělal, proti dnům, kdy ne.
        </p>

        {!drivers.hasVerdict ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Nemáš habit s rolí verdiktu, takže není co s čím porovnávat.
          </p>
        ) : solid.length === 0 && thin.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Zatím není dost zapsaných dní s verdiktem.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-1.5">
              {solid.map((d) => (
                <DriverRow key={d.habit.id} d={d} max={maxDriver} />
              ))}
            </div>

            {thin.length > 0 && (
              <div className="mt-4 border-t border-[var(--border)] pt-3">
                <p className="text-[11px] text-[var(--muted)]">
                  Málo dat (potřeba aspoň {MIN_GROUP_DAYS} dní na obou stranách):{' '}
                  {thin.map((d) => d.habit.label).join(', ')}
                </p>
              </div>
            )}

            <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted)]">
              Počítáno z {czDays(drivers.judgedDays)} s verdiktem. Že spolu dvě věci
              souvisí, ještě neznamená, že jedna způsobuje druhou.
            </p>
          </>
        )}
      </section>

      {/* ------------------------------------------------ den v týdnu */}
      <section className="bm-card p-4">
        <h2 className="text-sm font-semibold">Den v týdnu</h2>
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          {week.hasVerdict ? 'Podíl výher podle dne v týdnu.' : 'Kolik dní jsi zapsal podle dne v týdnu.'}
        </p>

        <div className="mt-4 grid grid-cols-7 items-end gap-1.5" style={{ height: 150 }}>
          {week.stats.map((s) => {
            const value = week.hasVerdict && s.winRate !== null ? s.winRate : s.loggedDays;
            const label =
              week.hasVerdict && s.winRate !== null
                ? `${Math.round(s.winRate)} %`
                : String(s.loggedDays);
            const height = weekMax === 0 ? 0 : (value / weekMax) * 100;
            const strong = week.hasVerdict && s.winRate !== null && s.winRate >= 60;
            const weak = week.hasVerdict && s.winRate !== null && s.winRate < 45;

            return (
              <div key={s.weekday} className="flex h-full flex-col justify-end gap-1">
                <span className="text-center text-[10px] tabular-nums text-[var(--muted)]">
                  {s.loggedDays === 0 ? '—' : label}
                </span>
                <span
                  className="rounded-t-[5px]"
                  style={{
                    height: `${height}%`,
                    minHeight: s.loggedDays === 0 ? 0 : 3,
                    background: strong ? 'var(--win)' : weak ? 'var(--loss)' : 'var(--accent)',
                  }}
                  title={`${WEEKDAYS[s.weekday]}: ${czDays(s.loggedDays)} zapsáno${
                    week.hasVerdict ? `, ${s.wins}× výhra, ${s.losses}× prohra` : ''
                  }`}
                />
                <span className="text-center text-[10px] text-[var(--muted)]">
                  {WEEKDAYS[s.weekday]}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted)]">
          Zapsaných dní v okně: {week.totalDays}.
        </p>
      </section>

      <Link href="/historie" className="bm-seg bm-press rounded-xl px-4 py-3 text-center text-sm">
        Zpět do historie
      </Link>
    </div>
  );
}

function DriverRow({
  d,
  max,
}: {
  d: { habit: { label: string }; points: number; daysWith: number; daysWithout: number };
  max: number;
}) {
  const pos = d.points >= 0;
  const width = (Math.abs(d.points) / max) * 50;
  const rounded = Math.round(d.points);

  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)_3.5rem] items-center gap-2 text-[13px]">
      <span className="truncate text-[var(--muted)]" title={d.habit.label}>
        {d.habit.label}
      </span>
      <span
        className="relative h-[20px] rounded-[5px]"
        style={{ background: 'var(--panel-2)' }}
        title={`${d.daysWith} dní ano · ${d.daysWithout} dní ne`}
      >
        <span
          className="absolute bottom-0 top-0 w-px"
          style={{ left: '50%', background: 'var(--border)' }}
        />
        <span
          className="absolute bottom-[3px] top-[3px] rounded-[3px]"
          style={{
            [pos ? 'left' : 'right']: '50%',
            width: `${width}%`,
            background: pos ? 'var(--win)' : 'var(--loss)',
          }}
        />
      </span>
      <span
        className="text-right tabular-nums"
        style={{ color: pos ? 'var(--win)' : 'var(--loss)' }}
      >
        {pos ? '+' : '−'}
        {Math.abs(rounded)} pb
      </span>
    </div>
  );
}
