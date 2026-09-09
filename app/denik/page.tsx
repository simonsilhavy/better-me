import Link from 'next/link';
import { getAnsweredQuestions, getDiary } from '@/lib/diary';
import { formatCz, weekday } from '@/lib/date';

export const dynamic = 'force-dynamic';

const PAGE = 60;

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; hledat?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const questionId = params.q?.trim() || undefined;
  const search = params.hledat?.trim() || undefined;
  const limit = Math.min(Math.max(Number(params.limit) || PAGE, PAGE), 1000);

  const [notes, questions] = await Promise.all([
    getDiary({ questionId, search, limit: limit + 1 }),
    getAnsweredQuestions(),
  ]);

  const hasMore = notes.length > limit;
  const shown = hasMore ? notes.slice(0, limit) : notes;

  const keep = (extra: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { q: questionId, hledat: search, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `/denik?${s}` : '/denik';
  };

  const active = questionId ? questions.find((q) => q.id === questionId) : undefined;

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div className="bm-card p-4">
        <h1 className="text-base font-semibold">Deník</h1>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Všechno, co jsi kdy napsal do poznámek a retrospektiv.
        </p>

        <form action="/denik" className="mt-3 flex gap-2">
          {questionId && <input type="hidden" name="q" value={questionId} />}
          <input
            type="search"
            name="hledat"
            defaultValue={search ?? ''}
            placeholder="Hledat v napsaném…"
            className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
          />
          <button
            type="submit"
            className="bm-press cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#0e0f13' }}
          >
            Hledat
          </button>
        </form>

        {(questionId || search) && (
          <Link
            href="/denik"
            className="mt-2 inline-block text-[11px] text-[var(--muted)] underline"
          >
            zrušit filtr
          </Link>
        )}
      </div>

      {questions.length > 0 && (
        <div className="bm-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Podle otázky
          </h2>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Ke každé odpovědi je uložená otázka, na kterou odpovídala — dá se tak
            číst, jak se tvoje odpovědi na jednu otázku mění v čase.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {questions.map((q) => {
              const on = q.id === questionId;
              return (
                <Link
                  key={q.id}
                  href={on ? keep({ q: undefined }) : keep({ q: q.id, limit: undefined })}
                  className="bm-seg rounded-lg px-2.5 py-1.5 text-[11px]"
                  style={
                    on
                      ? { background: 'var(--accent)', color: '#0e0f13', fontWeight: 600 }
                      : undefined
                  }
                  title={q.text}
                >
                  {q.text.length > 42 ? `${q.text.slice(0, 42)}…` : q.text}{' '}
                  <span className="tabular-nums opacity-60">{q.count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {active && (
        <p className="px-1 text-sm text-[var(--muted)]">
          Odpovědi na <span className="text-[var(--text)]">„{active.text}“</span>
        </p>
      )}

      {shown.length === 0 ? (
        <div className="bm-card p-8 text-center text-sm text-[var(--muted)]">
          {search || questionId
            ? 'Nic takového tu zatím není.'
            : 'Zatím jsi nic nenapsal. Až něco přibude do poznámky nebo retrospektivy, najdeš to tady.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((note) => (
            <article key={`${note.date}-${note.habit.id}`} className="bm-card p-4">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <Link
                  href={`/den/${note.date}`}
                  className="text-[11px] uppercase tracking-wider text-[var(--muted)] underline-offset-2 hover:underline"
                >
                  {weekday(note.date)} {formatCz(note.date)}
                </Link>
                {note.question ? (
                  <span className="text-xs" style={{ color: 'var(--accent)' }}>
                    {note.question}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--muted)]">{note.habit.label}</span>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--text)]">{note.text}</p>
            </article>
          ))}
        </div>
      )}

      {hasMore && (
        <Link
          href={keep({ limit: String(limit + PAGE) })}
          className="bm-seg bm-press rounded-xl px-4 py-3 text-center text-sm"
        >
          Načíst starší
        </Link>
      )}
    </div>
  );
}
