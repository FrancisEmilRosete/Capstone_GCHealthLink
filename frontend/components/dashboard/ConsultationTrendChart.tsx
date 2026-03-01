/**
 * CONSULTATION TREND CHART
 * ──────────────────────────────────────────────────────────────
 * A client component that shows consultation + check-up visit
 * counts over three time ranges, with a tab switcher and an
 * auto-generated AI text insight below the chart.
 *
 * Tabs:
 *   Daily   → hourly breakdown for today  (Bar chart)
 *   Weekly  → last 7 days                (Bar chart, 2 series)
 *   Monthly → last 4 weeks               (Bar chart, 2 series)
 *
 * AI Insight:
 *   generateInsight() reads the selected dataset and produces a
 *   short paragraph: peak period, totals, % change vs previous
 *   period, and a forward-looking recommendation.
 *
 * TODO: Replace MOCK_DATA with real API responses from the
 *       Express backend:  GET /api/stats/trends?period=daily|weekly|monthly
 */

'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────

type Period = 'daily' | 'weekly' | 'monthly';

interface DataPoint {
  label:         string;
  consultations: number;
  checkups?:     number;
}

interface TrendDataset {
  data:         DataPoint[];
  prevTotal:    number; // total of the PREVIOUS equivalent period (for % change)
  periodLabel:  string; // "Today", "This week", "This month"
  prevLabel:    string; // "Yesterday", "Last week", "Last month"
  peakKey:      string; // what a "label" means e.g. "hour", "day", "week"
}

// ── Mock Data ─────────────────────────────────────────────────
// TODO: Replace with API data

const TREND_DATA: Record<Period, TrendDataset> = {
  daily: {
    periodLabel: 'Today',
    prevLabel:   'Yesterday',
    peakKey:     'hour',
    prevTotal:   38,
    data: [
      { label: '8 AM',  consultations: 3 },
      { label: '9 AM',  consultations: 6 },
      { label: '10 AM', consultations: 9 },
      { label: '11 AM', consultations: 7 },
      { label: '12 PM', consultations: 2 },
      { label: '1 PM',  consultations: 5 },
      { label: '2 PM',  consultations: 8 },
      { label: '3 PM',  consultations: 5 },
      { label: '4 PM',  consultations: 3 },
      { label: '5 PM',  consultations: 1 },
    ],
  },
  weekly: {
    periodLabel: 'This week',
    prevLabel:   'Last week',
    peakKey:     'day',
    prevTotal:   115,
    data: [
      { label: 'Mon', consultations: 18, checkups: 12 },
      { label: 'Tue', consultations: 22, checkups: 15 },
      { label: 'Wed', consultations: 31, checkups: 19 },
      { label: 'Thu', consultations: 25, checkups: 14 },
      { label: 'Fri', consultations: 28, checkups: 18 },
      { label: 'Sat', consultations: 12, checkups:  8 },
      { label: 'Sun', consultations:  5, checkups:  3 },
    ],
  },
  monthly: {
    periodLabel: 'This month',
    prevLabel:   'Last month',
    peakKey:     'week',
    prevTotal:   398,
    data: [
      { label: 'Week 1', consultations:  95, checkups: 62 },
      { label: 'Week 2', consultations: 118, checkups: 78 },
      { label: 'Week 3', consultations: 107, checkups: 71 },
      { label: 'Week 4', consultations: 134, checkups: 89 },
    ],
  },
};

// ── AI Insight Generator ──────────────────────────────────────

/**
 * Reads the selected dataset and automatically generates a
 * human-readable insight with:
 *  - Total for the period
 *  - % change vs previous period  (▲ up / ▼ down)
 *  - Peak period label
 *  - Simple forward-looking recommendation
 */
function generateInsight(period: Period): string {
  const dataset = TREND_DATA[period];
  const { data, prevTotal, periodLabel, prevLabel, peakKey } = dataset;

  // Sum up consultations for the current period
  const currentTotal = data.reduce((sum, d) => sum + d.consultations, 0);

  // Sum up check-ups if they exist
  const checkupTotal = data.reduce((sum, d) => sum + (d.checkups ?? 0), 0);

  // Percentage change vs previous period
  const pctChange = prevTotal > 0
    ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100)
    : 0;
  const direction  = pctChange >= 0 ? '▲' : '▼';
  const changeText = pctChange >= 0
    ? `${direction} ${Math.abs(pctChange)}% more than ${prevLabel}`
    : `${direction} ${Math.abs(pctChange)}% fewer than ${prevLabel}`;

  // Find the peak data point
  const peak = data.reduce((max, d) =>
    d.consultations > max.consultations ? d : max
  , data[0]);

  // Compose insight parts
  const parts: string[] = [
    `${periodLabel} recorded ${currentTotal} consultations — ${changeText}.`,
    `Peak ${peakKey}: ${peak.label} (${peak.consultations} consultations).`,
  ];

  if (checkupTotal > 0) {
    parts.push(`Check-ups accounted for ${checkupTotal} of those visits.`);
  }

  // Simple forward-looking recommendation
  if (pctChange > 15) {
    parts.push('📌 Volume is significantly up — consider opening an additional consultation slot.');
  } else if (pctChange < -15) {
    parts.push('📌 Lower-than-usual traffic. A good day to catch up on documentation.');
  } else {
    parts.push('📌 Volume is within normal range. Keep monitoring for any sudden spikes.');
  }

  return parts.join('  ');
}

// ── Tabs Config ───────────────────────────────────────────────

const TABS: { id: Period; label: string }[] = [
  { id: 'daily',   label: 'Daily'   },
  { id: 'weekly',  label: 'Weekly'  },
  { id: 'monthly', label: 'Monthly' },
];

// ── Component ─────────────────────────────────────────────────

export default function ConsultationTrendChart() {
  const [activePeriod, setActivePeriod] = useState<Period>('weekly');

  const dataset = TREND_DATA[activePeriod];
  const hasCheckups = dataset.data.some((d) => d.checkups !== undefined);
  const insight = generateInsight(activePeriod);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-base font-bold text-gray-900">Consultation Trends</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Automatic AI insight updates as you switch periods
          </p>
        </div>

        {/* Period tab switcher — overflow-x-auto so it scrolls on very narrow screens */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto shrink-0">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActivePeriod(id)}
              className={`
                px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap
                ${activePeriod === id
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart — shorter on mobile to avoid excessive vertical space */}
      <div className="px-2 sm:px-6 pt-4 sm:pt-6 pb-2">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dataset.data} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
              cursor={{ fill: '#f0fdfa' }}
            />
            {hasCheckups && (
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                iconType="circle"
                iconSize={8}
              />
            )}
            <Bar
              dataKey="consultations"
              name="Consultations"
              fill="#0d9488"
              radius={[4, 4, 0, 0]}
            />
            {hasCheckups && (
              <Bar
                dataKey="checkups"
                name="Check-ups"
                fill="#99f6e4"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI Insight strip */}
      <div className="mx-4 sm:mx-6 mb-4 sm:mb-5 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
        <div className="flex items-start gap-2">
          {/* Brain / AI icon */}
          <span className="text-teal-500 text-sm mt-0.5 shrink-0">🤖</span>
          <div>
            <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wide mb-1">
              AI Insight
            </p>
            <p className="text-xs text-teal-900 leading-relaxed">
              {insight}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
