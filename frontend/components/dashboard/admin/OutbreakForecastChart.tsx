'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from 'recharts';

export interface OutbreakForecastPoint {
  period: string;
  predictedCases: number;
  lowerBound?: number;
  upperBound?: number;
  observedCases?: number;
  staffingRecommendation?: string;
  actionNote?: string;
  categories?: Array<{ name: string; cases: number }>;
}

interface OutbreakForecastChartProps {
  title?: string;
  subtitle?: string;
  data: OutbreakForecastPoint[];
  className?: string;
}

const WINDOW_OPTIONS = [
  { key: 3, label: '3M' },
  { key: 6, label: '6M' },
  { key: 12, label: '12M' },
  { key: 0, label: 'All' },
];

export default function OutbreakForecastChart({
  title = 'Seasonal Outbreak Forecast',
  subtitle = 'Expected clinic case volume and readiness guidance',
  data,
  className,
}: OutbreakForecastChartProps) {
  const [windowSize, setWindowSize] = useState<number>(6);
  const [showConfidenceBand, setShowConfidenceBand] = useState(true);

  const visibleData = useMemo(() => {
    if (windowSize === 0 || data.length <= windowSize) {
      return data;
    }
    return data.slice(-windowSize);
  }, [data, windowSize]);

  const hasConfidence = useMemo(
    () => visibleData.some((item) => typeof item.lowerBound === 'number' && typeof item.upperBound === 'number'),
    [visibleData],
  );

  const peakForecast = useMemo(() => {
    if (visibleData.length === 0) {
      return null;
    }

    return visibleData.reduce((best, row) => (row.predictedCases > best.predictedCases ? row : best), visibleData[0]);
  }, [visibleData]);

  const averageForecast = useMemo(() => {
    if (visibleData.length === 0) return 0;
    const total = visibleData.reduce((sum, row) => sum + row.predictedCases, 0);
    return Math.round((total / visibleData.length) * 10) / 10;
  }, [visibleData]);

  return (
    <section className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className ?? ''}`.trim()}>
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            {WINDOW_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setWindowSize(option.key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  windowSize === option.key
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-white hover:text-teal-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowConfidenceBand((previous) => !previous)}
            className={`rounded-xl border px-3 py-1 text-xs font-medium transition ${
              showConfidenceBand
                ? 'border-teal-200 bg-teal-50 text-teal-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-teal-200 hover:text-teal-700'
            }`}
            disabled={!hasConfidence}
          >
            {showConfidenceBand ? 'Confidence: On' : 'Confidence: Off'}
          </button>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Peak Forecast Window</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {peakForecast ? `${peakForecast.period} (${peakForecast.predictedCases} cases)` : 'No data yet'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Average Forecast Cases</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{averageForecast}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Readiness Note</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {peakForecast?.staffingRecommendation || 'Use standard clinic staffing plan'}
          </p>
        </div>
      </div>

      {visibleData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
          No forecast points available.
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visibleData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} label={{ value: 'Expected Cases', angle: -90, position: 'insideLeft', fontSize: 11 }} />

              <Tooltip
                contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }}
                labelStyle={{ fontWeight: 600 }}
                content={(props) => {
                  const { active, payload, label } = props;
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as OutbreakForecastPoint;
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-xl shadow-lg text-sm">
                        <p className="font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-2">{label}</p>
                        
                        <div className="space-y-1.5">
                          {payload.map((entry, index) => {
                            let name = entry.name;
                            if (entry.dataKey === 'predictedCases') name = 'Expected Total Cases';
                            if (entry.dataKey === 'observedCases') name = 'Actual Cases';
                            if (entry.dataKey === 'upperBound') name = 'Upper Estimate';
                            if (entry.dataKey === 'lowerBound') name = 'Lower Estimate';
                            
                            return (
                              <div key={`item-${index}`} className="flex justify-between items-center gap-4">
                                <span style={{ color: entry.color }} className="font-medium">{name}</span>
                                <span className="font-bold text-gray-900">{entry.value}</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        {data.categories && data.categories.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Illness Breakdown</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                              {data.categories
                                .filter((c) => c.cases > 0)
                                .sort((a, b) => b.cases - a.cases)
                                .map((cat, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600 truncate max-w-[120px] pr-2" title={cat.name}>{cat.name}</span>
                                    <span className="font-medium text-gray-800">{cat.cases}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />

              {showConfidenceBand && hasConfidence && (
                <>
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    name="Upper Estimate"
                    stroke="#f59e0b"
                    fill="#fef3c7"
                    fillOpacity={0.4}
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    name="Lower Estimate"
                    stroke="#f59e0b"
                    fill="#ffffff"
                    fillOpacity={1}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </>
              )}

              <Line
                type="monotone"
                dataKey="predictedCases"
                name="Expected Cases"
                stroke="#0f766e"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />

              {visibleData.some((item) => typeof item.observedCases === 'number') && (
                <Line
                  type="monotone"
                  dataKey="observedCases"
                  name="Actual Cases"
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 2 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
