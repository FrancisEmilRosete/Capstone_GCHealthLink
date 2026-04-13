'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

export interface HeatMapPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  intensity: number;
  cases?: number;
}

interface PredictiveHeatMapProps {
  title?: string;
  subtitle?: string;
  data: HeatMapPoint[];
  xLabel?: string;
  yLabel?: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
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
  subtitle = 'Spatial distribution of projected health events',
  data,
  xLabel = 'Zone X',
  yLabel = 'Zone Y',
  xDomain,
  yDomain,
  className,
}: PredictiveHeatMapProps) {
  const [selectedLevel, setSelectedLevel] = useState<(typeof INTENSITY_LEVELS)[number]['key']>('all');
  const [activePointId, setActivePointId] = useState<string>('');

  const filteredData = useMemo(() => {
    const selected = INTENSITY_LEVELS.find((item) => item.key === selectedLevel);
    if (!selected || selected.key === 'all') {
      return data;
    }

    const nextLevel = INTENSITY_LEVELS[INTENSITY_LEVELS.findIndex((item) => item.key === selectedLevel) + 1];
    const upper = nextLevel ? nextLevel.min : Number.POSITIVE_INFINITY;

    return data.filter((point) => point.intensity >= selected.min && point.intensity < upper);
  }, [data, selectedLevel]);

  const computedXDomain = useMemo<[number, number]>(() => {
    if (xDomain) return xDomain;
    const xValues = filteredData.map((point) => point.x);
    if (xValues.length === 0) return [0, 10];
    return [Math.min(...xValues) - 1, Math.max(...xValues) + 1];
  }, [filteredData, xDomain]);

  const computedYDomain = useMemo<[number, number]>(() => {
    if (yDomain) return yDomain;
    const yValues = filteredData.map((point) => point.y);
    if (yValues.length === 0) return [0, 10];
    return [Math.min(...yValues) - 1, Math.max(...yValues) + 1];
  }, [filteredData, yDomain]);

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

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" dataKey="x" domain={computedXDomain} tick={{ fontSize: 11 }}>
              <></>
            </XAxis>
            <YAxis type="number" dataKey="y" domain={computedYDomain} tick={{ fontSize: 11 }}>
              <></>
            </YAxis>
            <ZAxis type="number" dataKey="intensity" range={[80, 420]} />

            <Tooltip
              cursor={{ strokeDasharray: '4 4' }}
              formatter={(value: number, key: string) => [value, key === 'intensity' ? 'Intensity' : key]}
              contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }}
              labelFormatter={(_, payload) => {
                const point = payload?.[0]?.payload as HeatMapPoint | undefined;
                return point?.label || 'Location';
              }}
            />

            <Scatter
              data={filteredData}
              shape={(shapeProps) => {
                const point = shapeProps.payload as HeatMapPoint;
                const isActive = point.id === activePointId;

                return (
                  <circle
                    cx={shapeProps.cx}
                    cy={shapeProps.cy}
                    r={isActive ? 13 : 10}
                    fill={getHeatColor(point.intensity)}
                    fillOpacity={isActive ? 0.95 : 0.8}
                    stroke={isActive ? '#111827' : '#ffffff'}
                    strokeWidth={isActive ? 2 : 1}
                    onMouseEnter={() => setActivePointId(point.id)}
                    onMouseLeave={() => setActivePointId('')}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <span className="font-medium text-gray-500">Legend:</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> Low</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Medium</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-700" /> High</span>
        <span className="ml-auto text-gray-500">{xLabel} / {yLabel}</span>
      </footer>
    </section>
  );
}
