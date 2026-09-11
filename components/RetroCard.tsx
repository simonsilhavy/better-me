'use client';

import { useEffect, useState } from 'react';
import type { Habit, RetroValue } from '@/lib/domain';
import { REVEAL_HOUR, coverState, questionFor, revealKey } from '@/lib/retro';
import { localHour, today } from '@/lib/date';
import { AutoTextarea } from './AutoTextarea';
import { ScratchCard } from './ScratchCard';

/** How often a covered card re-checks whether the evening has arrived. */
const TICK_MS = 30_000;

/**
 * The day's retrospective: a question on top, room to answer underneath.
 *
 * Before the evening the whole card is under a foil you rub off. Seeing the
 * prompt in the morning would let you arrange the day around having a good
 * answer to it — the same distortion as chasing a win, only quieter. Rubbing
 * it open early is allowed and deliberate; drifting into it by accident is
 * what the foil prevents.
 */
export function RetroCard({
  habit,
  date,
  value,
  onChange,
}: {
  habit: Habit;
  date: string;
  value: RetroValue;
  onChange: (next: RetroValue) => void;
}) {
  const cfg = habit.config;
  const question = questionFor(habit, date, value);
  const hasAnswer = value.a.trim() !== '';

  // Locked until proven otherwise: the server cannot know what this device
  // has already scratched open, and the strictest state is the safe one to
  // paint first — the effect below settles it.
  const [state, setState] = useState<'open' | 'scratchable' | 'locked'>('locked');

  useEffect(() => {
    const settle = () => {
      let byHand = false;
      try {
        byHand = localStorage.getItem(revealKey(date)) === '1';
      } catch {
        // Storage blocked — the foil just has to be rubbed off again.
      }
      setState(
        coverState({
          date,
          todayDate: today(),
          hasAnswer,
          uncoveredByHand: byHand,
          hour: localHour(),
        }),
      );
    };

    settle();
    // A card left on screen at 19:58 should unlock by itself at eight, not sit
    // locked until the page is reloaded.
    const t = setInterval(settle, TICK_MS);
    return () => clearInterval(t);
  }, [date, hasAnswer]);

  const uncover = () => {
    try {
      localStorage.setItem(revealKey(date), '1');
    } catch {
      // Not remembering it means one more rub; nothing is lost.
    }
    setState('open');
  };

  const isToday = date === today();

  const card = (
    <div className="bm-card flex flex-col">
      {/* Top half asks, bottom half answers. */}
      <div className="border-b border-[var(--border)] p-4">
        {!cfg.hideLabel && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {habit.label}
          </p>
        )}
        <p className="text-sm font-medium text-[var(--text)]">
          {question?.text ?? 'Zatím tu není žádná otázka.'}
        </p>
      </div>
      <div className="p-4">
        <AutoTextarea
          value={value.a}
          onChange={(a) => onChange({ q: question?.id ?? value.q, a })}
          maxLength={cfg.maxLength ?? 4000}
          placeholder="Napiš, co tě k tomu napadá…"
        />
      </div>
    </div>
  );

  if (state === 'open') return card;

  const locked = state === 'locked';
  return (
    <ScratchCard
      onReveal={uncover}
      locked={locked}
      title={
        locked
          ? isToday
            ? 'Počkej do večera'
            : 'Otázka na tenhle den'
          : 'Dnešní otázka'
      }
      hint={
        locked
          ? isToday
            ? `Setřít ji půjde po ${REVEAL_HOUR}:00`
            : 'Setřít ji půjde až ten den večer'
          : 'Setři ji a odkryj'
      }
    >
      {card}
    </ScratchCard>
  );
}
