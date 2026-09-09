'use client';

import { useEffect, useState } from 'react';

const key = (id: number | 'none') => `bm-collapsed-${id}`;

/**
 * A collapsible group. Which groups are folded is a per-device convenience, so
 * it lives in localStorage rather than the database — and it is read after
 * mount, because the server has no way to know it.
 */
export function GroupPanel({
  id,
  label,
  filled,
  total,
  children,
}: {
  id: number | 'none';
  label: string;
  filled: number;
  total: number;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(key(id)) === '1');
    } catch {
      // Storage blocked — everything simply stays expanded.
    }
    setReady(true);
  }, [id]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(key(id), next ? '1' : '0');
    } catch {
      // Not remembering the fold is harmless.
    }
  };

  const complete = total > 0 && filled === total;

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="flex cursor-pointer items-center gap-2 px-1 pt-2 text-left"
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
        <span
          className="text-[11px] tabular-nums"
          style={{ color: complete ? 'var(--win)' : 'var(--muted)' }}
        >
          {filled}/{total}
        </span>
      </button>

      {ready && collapsed ? null : children}
    </section>
  );
}
