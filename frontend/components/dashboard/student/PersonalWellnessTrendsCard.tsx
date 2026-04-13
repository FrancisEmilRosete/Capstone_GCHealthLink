'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface PersonalVisitPoint {
  label: string;
  visits: number;
}

interface PersonalWellnessTrendsCardProps {
  title?: string;
  subtitle?: string;
  data: PersonalVisitPoint[];
  className?: string;
}

export default function PersonalWellnessTrendsCard({
  title = 'My Wellness Trend',
  subtitle = 'Clinic visits across recent months',
  data,
  className,
}: PersonalWellnessTrendsCardProps) {
  const total = useMemo(() => data.reduce((sum, row) => sum + row.visits, 0), [data]);
  const average = useMemo(() => (data.length ? Math.round((total / data.length) * 10) / 10 : 0), [data, total]);

  return (
    <section className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className ?? ''}`.trim()}>
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Total Visits</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Average / Month</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{average}</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
          No visit trend data available yet.
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }} />
              <Line
                type="monotone"
                dataKey="visits"
                name="Visits"
                stroke="#0d9488"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
