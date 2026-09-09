'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const PERIODS = [
  { days: 7, label: '7 dní' },
  { days: 14, label: '14 dní' },
  { days: 30, label: '30 dní' },
  { days: 90, label: '90 dní' },
  { days: 0, label: 'vše' },
] as const;

export function PeriodPicker({ current }: { current: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const pick = (days: number) => {
    const next = new URLSearchParams(params);
    next.set('obdobi', String(days));
    router.push(`${pathname}?${next}`);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {PERIODS.map((p) => (
        <button
          key={p.days}
          type="button"
          data-active={current === p.days}
          onClick={() => pick(p.days)}
          className="bm-seg cursor-pointer rounded-lg px-3 py-1.5 text-xs"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
