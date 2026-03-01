'use client';

/**
 * ADMIN DASHBOARD
 * Route: /dashboard/admin
 * Department Health Overview with stat cards + monthly trend chart.
 */

import Link from 'next/link';

// ── Mock data ─────────────────────────────────────────────────

const STAT_CARDS = [
  {
    label:    'Student Visits (This Month)',
    value:    '45',
    change:   '+5% from last month',
    positive: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    iconBg: 'bg-teal-50 text-teal-500',
  },
  {
    label:    'Medical Certificates',
    value:    '8',
    change:   'Issued this month',
    positive: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    iconBg: 'bg-blue-50 text-blue-500',
  },
  {
    label:    'Health Clearance Rate',
    value:    '92%',
    change:   'Students cleared this AY',
    positive: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-teal-50 text-teal-500',
  },
];

// Trend chart data (visits per week for 8 weeks)
const WEEKLY_TREND = [
  { week: 'Wk 1',  visits: 38 },
  { week: 'Wk 2',  visits: 45 },
  { week: 'Wk 3',  visits: 32 },
  { week: 'Wk 4',  visits: 50 },
  { week: 'Wk 5',  visits: 42 },
  { week: 'Wk 6',  visits: 57 },
  { week: 'Wk 7',  visits: 44 },
  { week: 'Wk 8',  visits: 39 },
];

const DEPARTMENT_BREAKDOWN = [
  { dept: 'Engineering',   count: 14, color: '#14b8a6' },
  { dept: 'Computing',     count: 11, color: '#3b82f6' },
  { dept: 'Health Sciences', count: 8, color: '#a855f7' },
  { dept: 'Education',     count: 6, color: '#f59e0b' },
  { dept: 'Business',      count: 6, color: '#ef4444' },
];

const RECENT_ACTIVITY = [
  { time: '9:45 AM',  action: 'Physical exam recorded',  detail: 'Juan dela Cruz — 1st Year Exam completed' },
  { time: '10:20 AM', action: 'Certificate issued',       detail: 'Ana Gomez — Medical excuse letter' },
  { time: '11:05 AM', action: 'Consultation logged',      detail: 'Marco Reyes — Fever, Biogesic dispensed' },
  { time: '1:30 PM',  action: 'New student registered',   detail: 'Maria Santos — Health record created' },
  { time: '2:15 PM',  action: 'Inventory alert',          detail: 'Amoxicillin stock below threshold (12 left)' },
];

// ── Mini sparkline (pure SVG, no recharts) ────────────────────

function Sparkline({ data }: { data: typeof WEEKLY_TREND }) {
  const max    = Math.max(...data.map(d => d.visits));
  const min    = Math.min(...data.map(d => d.visits));
  const range  = max - min || 1;
  const W      = 560;
  const H      = 120;
  const pad    = 30;
  const gW     = W - pad * 2;
  const gH     = H - pad * 2;

  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * gW,
    y: pad + gH - ((d.visits - min) / range) * gH,
    ...d,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length - 1].x},${H - pad} L${pts[0].x},${H - pad} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36" preserveAspectRatio="none">
      {/* Area fill */}
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#14b8a6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#spark-grad)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Data points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#14b8a6" />
      ))}
      {/* X labels */}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize="11" fill="#9ca3af">{p.week}</text>
      ))}
    </svg>
  );
}

// ── Department donut ──────────────────────────────────────────

function DeptDonut({ data }: { data: typeof DEPARTMENT_BREAKDOWN }) {
  const total  = data.reduce((s, d) => s + d.count, 0);
  const r = 70;
  const cx = 90; const cy = 90;
  let cumAngle = -90; // start from top

  const slices = data.map(d => {
    const angle  = (d.count / total) * 360;
    const start  = (cumAngle * Math.PI) / 180;
    const end    = ((cumAngle + angle) * Math.PI) / 180;
    cumAngle    += angle;

    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = angle > 180 ? 1 : 0;

    return { ...d, d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z` };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 180 180" className="w-36 h-36 shrink-0">
        {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
        {/* Donut hole */}
        <circle cx={cx} cy={cy} r="38" fill="white" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="bold" fill="#0f172a">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="#94a3b8">visits</text>
      </svg>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {data.map(d => (
          <div key={d.dept} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-sm text-gray-600">{d.dept}</span>
            <span className="text-sm font-semibold text-gray-800">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Department Health Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Academic Year 2025–2026 · As of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STAT_CARDS.map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium leading-tight">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{card.value}</p>
              <p className={`text-xs mt-0.5 ${card.positive ? 'text-teal-600' : 'text-red-500'}`}>
                {card.change}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Trends Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Monthly Trends</h2>
          <span className="text-xs text-gray-400">Weekly visits · Current month</span>
        </div>
        <Sparkline data={WEEKLY_TREND} />
      </div>

      {/* Bottom Row: Department breakdown + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Department breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Visits by Department</h2>
          <DeptDonut data={DEPARTMENT_BREAKDOWN} />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Recent Activity</h2>
            <Link href="/dashboard/admin/audit" className="text-xs text-teal-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((a, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-[11px] text-gray-400 w-16 shrink-0 pt-0.5">{a.time}</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">{a.action}</p>
                  <p className="text-xs text-gray-400">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
