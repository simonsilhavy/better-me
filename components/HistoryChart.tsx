'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Entry } from '@/lib/domain';
import { shortLabel } from '@/lib/date';

type Metric = 'energie' | 'cviceni' | 'dp';

const METRICS: { key: Metric; label: string }[] = [
  { key: 'energie', label: 'Energie' },
  { key: 'cviceni', label: 'Kliky / dřepy' },
  { key: 'dp', label: 'Daňová Pohoda' },
];

const SERIES: Record<Metric, { key: string; name: string; color: string }[]> = {
  energie: [
    { key: 'energyMorning', name: 'Ráno', color: 'var(--accent)' },
    { key: 'energyUsed', name: 'Využitá', color: 'var(--win)' },
  ],
  cviceni: [
    { key: 'kliky', name: 'Kliky', color: 'var(--accent)' },
    { key: 'drepy', name: 'Dřepy', color: 'var(--win)' },
  ],
  dp: [{ key: 'dpMinutes', name: 'Minuty', color: 'var(--accent)' }],
};

export function HistoryChart({ data }: { data: Entry[] }) {
  const [metric, setMetric] = useState<Metric>('energie');

  const chartData = data.map((e) => ({
    label: shortLabel(e.date),
    energyMorning: e.energyMorning,
    energyUsed: e.energyUsed,
    kliky: e.kliky,
    drepy: e.drepy,
    dpMinutes: e.dpMinutes,
  }));

  return (
    <div className="bm-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Posledních 14 dní</h2>
        <div className="flex gap-1.5">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              data-active={metric === m.key}
              onClick={() => setMetric(m.key)}
              className="bm-seg cursor-pointer rounded-lg px-2.5 py-1 text-xs"
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={44}
            />
            <YAxis
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{
                background: 'var(--panel-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                color: 'var(--text)',
                fontSize: 12,
              }}
              labelStyle={{ color: 'var(--muted)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
            {SERIES[metric].map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
