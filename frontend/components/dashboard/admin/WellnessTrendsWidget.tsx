'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface WellnessTrendPoint {
  label: string;
  visits: number;
}

export interface WellnessConcernShare {
  tag: string;
  count: number;
}

interface WellnessTrendsWidgetProps {
  title?: string;
  subtitle?: string;
  totalVisits: number;
  monthly: WellnessTrendPoint[];
  weekly: WellnessTrendPoint[];
  concerns?: WellnessConcernShare[];
  className?: string;
}

const PIE_COLORS = ['#0d9488', '#2563eb', '#f97316', '#dc2626', '#7c3aed', '#64748b'];

export default function WellnessTrendsWidget({
  title = 'Campus Wellness Trends',
  subtitle = 'Aggregate movement across recent clinic activity',
  totalVisits,
  monthly,
  weekly,
  concerns = [],
  className,
}: WellnessTrendsWidgetProps) {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('monthly');
  const chartData = timeframe === 'monthly' ? monthly : weekly;

  const average = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((accumulator, row) => accumulator + row.visits, 0);
    return Math.round((sum / chartData.length) * 10) / 10;
  }, [chartData]);

  const peak = useMemo(() => {
    if (chartData.length === 0) {
      return { label: '-', visits: 0 };
    }

    return chartData.reduce((best, row) => (row.visits > best.visits ? row : best), chartData[0]);
  }, [chartData]);

  return (
    <section className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className ?? ''}`.trim()}>
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>

        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          {(['weekly', 'monthly'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTimeframe(key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                timeframe === key
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-white hover:text-teal-700'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Total Visits</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{totalVisits}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Average</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{average}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Peak</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{peak.label} ({peak.visits})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="h-64 xl:col-span-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }} />
              <Bar dataKey="visits" name="Clinic Visits" radius={[8, 8, 0, 0]}>
                {chartData.map((row, index) => (
                  <Cell key={`${row.label}-${index}`} fill={index === chartData.length - 1 ? '#0d9488' : '#99f6e4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-64 xl:col-span-2">
          {concerns.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
              No concern share data.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={concerns}
                  dataKey="count"
                  nameKey="tag"
                  cx="50%"
                  cy="50%"
                  outerRadius={78}
                  innerRadius={42}
                  paddingAngle={2}
                >
                  {concerns.map((entry, index) => (
                    <Cell key={entry.tag} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
