'use client';

import { useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Habit } from '@/lib/domain';
import { shortLabel } from '@/lib/date';

export type ChartPoint = { date: string } & Record<string, number | string>;

/**
 * Numeric habits only, and one habit family at a time: percentages and rep
 * counts cannot share an axis without implying a comparison that isn't there.
 */
export function HistoryChart({
  data,
  habits,
  title = 'Průběh',
}: {
  data: ChartPoint[];
  habits: Habit[];
  title?: string;
}) {
  const numeric = habits.filter((h) =>
    ['scale', 'counter', 'duration'].includes(h.kind),
  );
  const [selected, setSelected] = useState(numeric[0]?.key ?? '');

  if (numeric.length === 0) {
    return (
      <div className="bm-card p-6 text-center text-sm text-[var(--muted)]">
        Zatím nemáš žádný číselný habit, ze kterého by šel graf sestavit.
      </div>
    );
  }

  const habit = numeric.find((h) => h.key === selected) ?? numeric[0];
  const chartData = data.map((d) => ({
    label: shortLabel(String(d.date)),
    value: typeof d[habit.key] === 'number' ? (d[habit.key] as number) : 0,
  }));

  return (
    <div className="bm-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="flex flex-wrap gap-1.5">
          {numeric.length > 1 ? numeric.map((h) => (
            <button
              key={h.key}
              type="button"
              data-active={habit.key === h.key}
              onClick={() => setSelected(h.key)}
              className="bm-seg cursor-pointer rounded-lg px-2.5 py-1 text-xs"
            >
              {h.label}
            </button>
          )) : null}
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }}
              tickLine={false} axisLine={{ stroke: 'var(--border)' }}
              interval={0} angle={-45} textAnchor="end" height={44}
            />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={34} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{
                background: 'var(--panel-2)', border: '1px solid var(--border)',
                borderRadius: 12, color: 'var(--text)', fontSize: 12,
              }}
              labelStyle={{ color: 'var(--muted)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
            <Bar dataKey="value" name={habit.label} fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
