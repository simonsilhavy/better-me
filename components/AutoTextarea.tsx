'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * A textarea that grows with what is written in it.
 *
 * The fixed four rows hid the end of any longer answer on a phone, which is
 * exactly where the long answers get written. It still starts at `minRows` so
 * an empty field keeps the shape of the card around it.
 */
export function AutoTextarea({
  value,
  onChange,
  minRows = 4,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'rows'>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    // Collapse first: without this the box can only ever grow, never shrink
    // back when text is deleted.
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  // Before paint, so the first frame is already the right height rather than
  // snapping a moment later.
  useLayoutEffect(resize, [value]);

  // Wrapping changes with the width, so a rotated phone needs a fresh measure.
  useEffect(() => {
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-none overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
      {...rest}
    />
  );
}
