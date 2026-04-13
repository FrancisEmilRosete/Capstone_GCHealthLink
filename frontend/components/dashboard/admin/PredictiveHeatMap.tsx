'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface HeatMapPoint {
  id: string;
  department: string;
  activeCases: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  recommendedAction?: string;
}

interface PredictiveHeatMapProps {
  title?: string;
  subtitle?: string;
  data: HeatMapPoint[];
  className?: string;
}

const INTENSITY_LEVELS = [
  { key: 'all', label: 'All', min: Number.NEGATIVE_INFINITY },
  { key: 'low', label: 'Low', min: 0 },
  { key: 'medium', label: 'Medium', min: 40 },
  { key: 'high', label: 'High', min: 70 },
];

function getHeatColor(value: number) {
  if (value >= 70) return '#b91c1c';
  if (value >= 40) return '#f97316';
  return '#0d9488';
}

export default function PredictiveHeatMap({
  title = 'Predictive Heat Map',
  subtitle = 'Department-level risk score based on recent clinic activity',
  data,
  className,
}: PredictiveHeatMapProps) {
  const [selectedLevel, setSelectedLevel] = useState<(typeof INTENSITY_LEVELS)[number]['key']>('all');

  const filteredData = useMemo(() => {
    const selected = INTENSITY_LEVELS.find((item) => item.key === selectedLevel);
    if (!selected || selected.key === 'all') {
      return data.slice().sort((a, b) => b.riskScore - a.riskScore);
    }

    const nextLevel = INTENSITY_LEVELS[INTENSITY_LEVELS.findIndex((item) => item.key === selectedLevel) + 1];
    const upper = nextLevel ? nextLevel.min : Number.POSITIVE_INFINITY;

    return data
      .filter((point) => point.riskScore >= selected.min && point.riskScore < upper)
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [data, selectedLevel]);

  const highestRiskDepartment = filteredData[0];

  const highRiskCount = filteredData.filter((item) => item.riskLevel === 'High').length;

  return (
    <section className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className ?? ''}`.trim()}>
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>

        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          {INTENSITY_LEVELS.map((level) => (
            <button
              key={level.key}
              type="button"
              onClick={() => setSelectedLevel(level.key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                selectedLevel === level.key
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-white hover:text-teal-700'
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Highest Risk Department</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {highestRiskDepartment?.department || 'No data yet'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Departments In High Risk</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{highRiskCount}</p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredData} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={170} />

            <Tooltip
              contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }}
              formatter={(value: number, key: string) => {
                if (key === 'riskScore') return [value, 'Outbreak Risk Score'];
                if (key === 'activeCases') return [value, 'Recent Cases (48h)'];
                return [value, key];
              }}
              labelFormatter={(_, payload) => {
                const point = payload?.[0]?.payload as HeatMapPoint | undefined;
                if (!point) return 'Department';

                return `${point.department} • ${point.riskLevel} Risk`;
              }}
            />

            <Bar dataKey="riskScore" name="Risk Score" radius={[0, 8, 8, 0]}>
              {filteredData.map((row) => (
                <Cell key={row.id} fill={getHeatColor(row.riskScore)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <span className="font-medium text-gray-500">Legend:</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> Low</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Medium</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-700" /> High</span>
        {highestRiskDepartment?.recommendedAction && (
          <span className="ml-auto text-gray-500">Priority Action: {highestRiskDepartment.recommendedAction}</span>
        )}
      </footer>
    </section>
  );
}
