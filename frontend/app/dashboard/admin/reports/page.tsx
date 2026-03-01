'use client';

/**
 * ADMIN REPORTS & ANALYTICS
 * Route: /dashboard/admin/reports
 * Weekly Clinic Visits (line), Visits by Department (donut), Top Illnesses (bar).
 */

import { useState } from 'react';

// ── Mock data ─────────────────────────────────────────────────

const WEEKLY_VISITS = [
  { day: 'Mon',  visits: 12 },
  { day: 'Tue',  visits: 18 },
  { day: 'Wed',  visits: 15 },
  { day: 'Thu',  visits: 22 },
  { day: 'Fri',  visits: 19 },
  { day: 'Sat',  visits: 7  },
];

const DEPT_VISITS = [
  { dept: 'Engineering',   count: 110, color: '#14b8a6' },
  { dept: 'Nursing',       count: 80,  color: '#3b82f6' },
  { dept: 'Arts',          count: 55,  color: '#f59e0b' },
  { dept: 'Science',       count: 75,  color: '#ef4444' },
];

const TOP_ILLNESSES = [
  { name: 'Viral Flu',    count: 48 },
  { name: 'Headache',     count: 35 },
  { name: 'Stomach Ache', count: 28 },
  { name: 'Allergy',      count: 20 },
  { name: 'Injury',       count: 15 },
];

const MONTHLY_SUMMARY = [
  { month: 'Aug', count: 52 },
  { month: 'Sep', count: 68 },
  { month: 'Oct', count: 74 },
  { month: 'Nov', count: 61 },
  { month: 'Dec', count: 29 },
  { month: 'Jan', count: 83 },
  { month: 'Feb', count: 70 },
  { month: 'Mar', count: 45 },
];

// ── SVG chart helpers ─────────────────────────────────────────

function LineChart({ data }: { data: typeof WEEKLY_VISITS }) {
  const max   = Math.max(...data.map(d => d.visits));
  const W     = 500; const H = 140; const pad = 28;
  const gW    = W - pad * 2; const gH = H - pad * 2;

  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * gW,
    y: pad + gH - (d.visits / max) * gH,
    ...d,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length - 1].x},${H - pad} L${pts[0].x},${H - pad} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="lc-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#14b8a6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#lc-grad)" />
      <path d={pathD} fill="none" stroke="#14b8a6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#14b8a6" strokeWidth="2.2" />
          <text x={p.x} y={H - 6} textAnchor="middle" fontSize="11" fill="#9ca3af">{p.day}</text>
        </g>
      ))}
      {/* Y legend */}
      <text x={4} y={pad + 4}   fontSize="10" fill="#9ca3af">{max}</text>
      <text x={4} y={H - pad + 4} fontSize="10" fill="#9ca3af">0</text>
      {/* Legend */}
      <circle cx={pad} cy={H - 4} r="4" fill="#14b8a6" />
      <text x={pad + 8} y={H - 1} fontSize="11" fill="#9ca3af">Visits</text>
    </svg>
  );
}

function DonutChart({ data }: { data: typeof DEPT_VISITS }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const r = 70; const cx = 90; const cy = 90;
  let cum = -90;

  const slices = data.map(d => {
    const angle = (d.count / total) * 360;
    const s = (cum * Math.PI) / 180;
    const e = ((cum + angle) * Math.PI) / 180;
    cum += angle;
    const x1 = cx + r * Math.cos(s); const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e); const y2 = cy + r * Math.sin(e);
    return { ...d, d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${angle > 180 ? 1 : 0},1 ${x2},${y2} Z` };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 180 180" className="w-36 h-36 shrink-0">
        {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
        <circle cx={cx} cy={cy} r="38" fill="white" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="17" fontWeight="700" fill="#0f172a">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="#94a3b8">total</text>
      </svg>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {data.map(d => (
          <div key={d.dept} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-sm text-gray-600">{d.dept}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: typeof TOP_ILLNESSES }) {
  const max = Math.max(...data.map(d => d.count));
  return (
    <div className="flex items-end gap-4 h-44">
      {data.map(d => (
        <div key={d.name} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-xs font-semibold text-gray-600">{d.count}</span>
          <div
            className="w-full rounded-t-lg bg-teal-500 min-h-[4px] transition-all"
            style={{ height: `${(d.count / max) * 130}px` }}
          />
          <span className="text-[10px] text-gray-500 text-center leading-tight">{d.name}</span>
        </div>
      ))}
    </div>
  );
}

function MonthlyBarChart({ data }: { data: typeof MONTHLY_SUMMARY }) {
  const max = Math.max(...data.map(d => d.count));
  return (
    <div className="flex items-end gap-3 h-40">
      {data.map(d => (
        <div key={d.month} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[10px] font-semibold text-gray-500">{d.count}</span>
          <div
            className="w-full rounded-t-lg bg-blue-400 min-h-[4px]"
            style={{ height: `${(d.count / max) * 120}px` }}
          />
          <span className="text-[10px] text-gray-500">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// ── CSV Export ────────────────────────────────────────────────

function exportReport() {
  const rows = [
    ['Report', 'GC HealthLink Admin Report'],
    ['Generated', new Date().toLocaleString()],
    [],
    ['=== WEEKLY CLINIC VISITS ==='],
    ['Day', 'Visits'],
    ...WEEKLY_VISITS.map(d => [d.day, d.visits]),
    [],
    ['=== VISITS BY DEPARTMENT ==='],
    ['Department', 'Count'],
    ...DEPT_VISITS.map(d => [d.dept, d.count]),
    [],
    ['=== TOP ILLNESSES ==='],
    ['Illness', 'Count'],
    ...TOP_ILLNESSES.map(d => [d.name, d.count]),
    [],
    ['=== MONTHLY SUMMARY ==='],
    ['Month', 'Count'],
    ...MONTHLY_SUMMARY.map(d => [d.month, d.count]),
  ];

  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `admin_report_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── KPI Cards ─────────────────────────────────────────────────

const KPIS = [
  { label: 'Total Visits',       value: '482',  sub: 'This academic year'  },
  { label: 'Monthly Average',    value: '60',   sub: 'Avg visits / month'  },
  { label: 'Peak Month',         value: 'Jan',  sub: '83 visits recorded'  },
  { label: 'Clearance Rate',     value: '92%',  sub: 'Health clearance AY' },
];

// ── Page ──────────────────────────────────────────────────────

export default function AdminReports() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Clinic performance and health trends</p>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Report
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {KPIS.map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{k.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{k.label}</p>
            <p className="text-[11px] text-gray-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Weekly Clinic Visits */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Weekly Clinic Visits</h2>
        <LineChart data={WEEKLY_VISITS} />
      </div>

      {/* Row: Donut + Monthly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Visits by Department</h2>
          <DonutChart data={DEPT_VISITS} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Monthly Visit Summary</h2>
          <MonthlyBarChart data={MONTHLY_SUMMARY} />
        </div>
      </div>

      {/* Top Illnesses */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-5">Top Illnesses</h2>
        <BarChart data={TOP_ILLNESSES} />
      </div>

    </div>
  );
}
