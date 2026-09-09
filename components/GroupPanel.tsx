'use client';

import { useEffect, useRef, useState } from 'react';

const key = (id: number | 'none') => `bm-collapsed-${id}`;

/** How long a finished group stays open before folding itself away. */
const FOLD_DELAY_MS = 1100;

/** How long a value must hold still before it counts as the reader's answer. */
const SETTLE_MS = 700;

/**
 * A collapsible group.
 *
 * Which groups are folded is a per-device convenience, so it lives in
 * localStorage rather than the database — and it is read after mount, because
 * the server has no way to know it.
 *
 * A group that reaches its full count folds itself after a short pause, so the
 * page shortens as it gets filled in instead of staying one long form. The
 * pause exists so the fold never happens under a finger that is still working:
 * any further change restarts it, and folding by hand always wins over the
 * automatic one.
 */
export function GroupPanel({
  id,
  label,
  filled,
  total,
  emoji,
  active,
  summary,
  children,
}: {
  id: number | 'none';
  label: string;
  filled: number;
  total: number;
  /** Optional flourish for this group; only fires when `active` is true. */
  emoji?: string;
  /** Whether anything was actually done — see the emoji rule in CLAUDE.md. */
  active?: boolean;
  /** One line of what is inside, shown only once the group is folded away. */
  summary?: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [popping, setPopping] = useState(false);

  /** Set once the reader folds or unfolds by hand; disables the automatic fold. */
  const manual = useRef(false);
  const wasComplete = useRef(false);
  /** Whether the flourish's condition already held, so it fires on the edge. */
  const wasEarned = useRef(false);
  /** False until the first settled render, so opening a finished day is quiet. */
  const armed = useRef(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(key(id)) === '1');
    } catch {
      // Storage blocked — everything simply stays expanded.
    }
    setReady(true);
  }, [id]);

  const complete = total > 0 && filled === total;

  // Folding hangs off completion. Re-running on `filled` is what restarts the
  // timer when the reader keeps editing a group that was already full.
  useEffect(() => {
    if (!ready) return;

    if (!complete) {
      wasComplete.current = false;
      return;
    }
    wasComplete.current = true;

    if (manual.current || collapsed) return;

    const t = setTimeout(() => {
      setCollapsed(true);
      try {
        localStorage.setItem(key(id), '1');
      } catch {
        // Not remembering the fold is harmless.
      }
    }, FOLD_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled, total, ready]);

  const earned = complete && Boolean(emoji) && Boolean(active);

  // The flourish fires on the edge into "finished, and something was done" —
  // which is not the same edge as finishing. Raising a value off zero in a
  // group that is already full earns it too, and re-opening a day that earned
  // it long ago does not: the first settled render only records the baseline.
  //
  // It waits for the value to settle first. A slider already sitting at zero
  // can only be answered by dragging away and back, so every honest "I did
  // none today" sweeps through real numbers on the way — and without this
  // pause the flourish would fire on a rest day, for values passed through
  // rather than kept.
  useEffect(() => {
    if (!ready) return;
    if (!armed.current) {
      armed.current = true;
      wasEarned.current = earned;
      return;
    }
    const t = setTimeout(() => {
      if (earned && !wasEarned.current) setPopping(true);
      wasEarned.current = earned;
    }, SETTLE_MS);
    return () => clearTimeout(t);
  }, [earned, ready]);

  // The pop is one-shot; clearing it lets a later completion fire it again.
  useEffect(() => {
    if (!popping) return;
    const t = setTimeout(() => setPopping(false), 1200);
    return () => clearTimeout(t);
  }, [popping]);

  const toggle = () => {
    manual.current = true;
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(key(id), next ? '1' : '0');
    } catch {
      // Not remembering the fold is harmless.
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="relative flex cursor-pointer items-center gap-2 rounded-lg px-1 pt-2 text-left"
        style={{
          transition: 'background-color 320ms ease',
          backgroundColor: complete
            ? 'color-mix(in srgb, var(--win) 12%, transparent)'
            : 'transparent',
        }}
      >
        <span
          className="text-[10px] transition-transform"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', color: 'var(--muted)' }}
          aria-hidden="true"
        >
          ▼
        </span>
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {label}
        </span>

        {popping && (
          <span className="bm-pop pointer-events-none absolute right-1 top-1 text-base" aria-hidden="true">
            {emoji}
          </span>
        )}

        <span
          className="text-[11px] tabular-nums"
          style={{ color: complete ? 'var(--win)' : 'var(--muted)' }}
        >
          {complete ? '✓ hotovo' : `${filled}/${total}`}
        </span>
      </button>

      {ready && collapsed ? (
        summary ? (
          <p className="truncate px-1 pb-1 text-[11px] text-[var(--muted)]" title={summary}>
            {summary}
          </p>
        ) : null
      ) : (
        children
      )}
    </section>
  );
}
