/**
 * REPORTS & ANALYTICS PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /dashboard/staff/reports
 * TODO: Replace mock data with GET /api/reports
 */

'use client';

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ── Mock data ─────────────────────────────────────────────────
const MONTHLY_CONSULTS = [
  { month: 'Mar',  consultations: 8  },
  { month: 'Apr',  consultations: 12 },
  { month: 'May',  consultations: 9  },
  { month: 'Jun',  consultations: 15 },
  { month: 'Jul',  consultations: 11 },
  { month: 'Aug',  consultations: 20 },
  { month: 'Sep',  consultations: 18 },
  { month: 'Oct',  consultations: 25 },
  { month: 'Nov',  consultations: 22 },
  { month: 'Dec',  consultations: 14 },
  { month: 'Jan',  consultations: 17 },
  { month: 'Feb',  consultations: 10 },
];

const TOP_DIAGNOSES = [
  { name: 'Viral Flu',        count: 18 },
  { name: 'Tension Headache', count: 14 },
  { name: 'Gastritis',        count: 11 },
  { name: 'URI',              count: 9  },
  { name: 'Anemia',           count: 7  },
  { name: 'Hyperacidity',     count: 6  },
  { name: 'Ankle Sprain',     count: 4  },
];

const BMI_DIST = [
  { label: 'Underweight', value: 8,  color: '#60a5fa' },
  { label: 'Normal',      value: 42, color: '#34d399' },
  { label: 'Overweight',  value: 15, color: '#fbbf24' },
  { label: 'Obese',       value: 5,  color: '#f87171' },
];

const BLOOD_TYPES = [
  { name: 'O+', value: 28 },
  { name: 'A+', value: 18 },
  { name: 'B+', value: 12 },
  { name: 'AB+',value: 6  },
  { name: 'O-', value: 4  },
  { name: 'A-', value: 2  },
];

const PIE_COLORS = ['#14b8a6','#60a5fa','#a78bfa','#fb923c','#f87171','#4ade80'];

// ── Helper components ─────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label:string; value:string|number; sub?:string; color:string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ReportsPage() {
  const totalConsults = MONTHLY_CONSULTS.reduce((s, m) => s + m.consultations, 0);
  const avgMonthly    = Math.round(totalConsults / MONTHLY_CONSULTS.length);
  const peakMonth     = MONTHLY_CONSULTS.reduce((a, b) => b.consultations > a.consultations ? b : a).month;
  const totalExams    = BMI_DIST.reduce((s, v) => s + v.value, 0);

  function csv(headers: string[], rows: (string | number)[][]): Blob {
    const lines = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))];
    return new Blob([lines.join('\n')], { type: 'text/csv' });
  }
  function dl(blob: Blob, name: string) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  }

  function downloadReport() {
    dl(csv(
      ['Month', 'Consultations'],
      MONTHLY_CONSULTS.map((r) => [r.month, r.consultations])
    ), 'monthly_consultations.csv');
    setTimeout(() => dl(csv(
      ['Diagnosis', 'Count'],
      TOP_DIAGNOSES.map((r) => [r.name, r.count])
    ), 'top_diagnoses.csv'), 250);
    setTimeout(() => dl(csv(
      ['BMI Category', 'Count'],
      BMI_DIST.map((r) => [r.label, r.value])
    ), 'bmi_distribution.csv'), 500);
    setTimeout(() => dl(csv(
      ['Blood Type', 'Count'],
      BLOOD_TYPES.map((r) => [r.name, r.value])
    ), 'blood_types.csv'), 750);
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-xs text-gray-400 mt-0.5">Clinic health data overview</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl">AY 2025–2026</span>
          <button
            onClick={downloadReport}
            className="flex items-center gap-1.5 text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white px-3 py-2 rounded-xl transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Download Report
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Consultations" value={totalConsults} sub="This academic year" color="text-teal-500"/>
        <StatCard label="Avg / Month"         value={avgMonthly}    sub="Consultations"      color="text-blue-500"/>
        <StatCard label="Peak Month"          value={peakMonth}     sub="Most consultations" color="text-purple-500"/>
        <StatCard label="Exams Recorded"      value={totalExams}    sub="Physical exams"      color="text-orange-500"/>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Consultations">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY_CONSULTS} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }}/>
              <Area type="monotone" dataKey="consultations" stroke="#14b8a6" strokeWidth={2} fill="url(#cgGrad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Diagnoses">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={TOP_DIAGNOSES} layout="vertical" margin={{ top: 0, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110}/>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }}/>
              <Bar dataKey="count" fill="#14b8a6" radius={[0,6,6,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="BMI Distribution (Physical Exams)">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie data={BMI_DIST} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {BMI_DIST.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {BMI_DIST.map((b) => (
                <div key={b.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }}/>
                  <p className="text-xs text-gray-600 flex-1">{b.label}</p>
                  <p className="text-xs font-bold text-gray-800">{b.value}</p>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Blood Type Distribution">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={BLOOD_TYPES} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }}/>
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {BLOOD_TYPES.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
