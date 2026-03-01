/**
 * DASHBOARD HOME PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /dashboard/[role]
 *
 * The first page a user lands on after logging in.
 * The Sidebar + TopBar are handled by app/dashboard/layout.tsx —
 * this file only renders the main content area.
 *
 * Sections:
 *   1. Page header    → title, date, action buttons
 *   2. Stat cards     → Today's Visits, Total Students, Low Stock, Pending Certs
 *   3. Trend chart    → Daily / Weekly / Monthly with AI auto-insight
 *   4. Recent Consultations table + Common Illnesses chart
 *   5. Inventory Alerts  → Stock issues + Expiry notifications (combined)
 *
 * TODO: Replace mock data with real API calls once the Express
 *       backend endpoints are ready.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import ConsultationTrendChart from '@/components/dashboard/ConsultationTrendChart';

interface DashboardPageProps {
  params: Promise<{ role: string }>;
}

const VALID_ROLES = ['staff', 'student', 'faculty'];

// ── Mock Data (replace with API calls later) ──────────────────

const STAT_CARDS = [
  {
    label:    "Today's Visits",
    value:    '12',
    change:   '+10% from last month',
    positive: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    iconBg: 'bg-teal-50 text-teal-500',
  },
  {
    label:    'Total Students',
    value:    '2',
    change:   'Registered today',
    positive: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    iconBg: 'bg-blue-50 text-blue-500',
  },
  {
    label:    'Inventory Alerts',
    value:    '5',
    change:   '2 low stock · 3 expiring soon',
    positive: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    iconBg: 'bg-amber-50 text-amber-500',
  },
  {
    label:    'Pending Certificates',
    value:    '3',
    change:   'Awaiting approval',
    positive: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    iconBg: 'bg-teal-50 text-teal-500',
  },
];

const RECENT_CONSULTATIONS = [
  { student: 'Juan dela Cruz',    date: '10/19/2023', diagnosis: 'Viral Flu',                        staff: 'Dr. Maria Santos'    },
  { student: 'Ana Gomez',         date: '10/20/2023', diagnosis: 'Hypertensivity',                   staff: 'Nurse John Reyes'    },
  { student: 'Juan dela Cruz',    date: '4/5/2023',   diagnosis: 'Upper Respiratory Tract Infection', staff: 'Dr. Maria Santos'    },
  { student: 'Juan dela Cruz',    date: '12/1/2023',  diagnosis: 'Anemia',                           staff: 'Dr. Maria Santos'    },
  { student: 'Juan dela Cruz',    date: '12/1/2023',  diagnosis: 'Helicobacter pylori Infection',    staff: 'Nurse John Reyes'    },
];

// Bar heights are percentages relative to the tallest bar (Cough = 100%)
const COMMON_ILLNESSES = [
  { name: 'Fever',     pct: 72 },
  { name: 'Cough',     pct: 100 },
  { name: 'Headache',  pct: 58 },
  { name: 'Flu',       pct: 45 },
  { name: 'Stomach',   pct: 35 },
];

const STOCK_ALERTS = [
  { name: 'Neozep',      remaining: '25 tablets remaining', status: 'Low Stock',    statusColor: 'bg-amber-100 text-amber-700' },
  { name: 'Amoxicillin', remaining: '5 capsules remaining', status: 'Out of Stock', statusColor: 'bg-red-100   text-red-700'   },
];

/**
 * Medicine expiry alert data.
 * `daysLeft` = days until expiry from today (negative = already expired).
 * TODO: Compute daysLeft dynamically on the backend:
 *       daysLeft = Math.ceil((expiryDate - today) / 86400000)
 */
const EXPIRY_ALERTS = [
  { name: 'Biogesic',       expiryDate: 'Feb 28, 2026', daysLeft:   0, stock: 12 },
  { name: 'Mefenamic Acid', expiryDate: 'Mar 5, 2026',  daysLeft:   5, stock: 34 },
  { name: 'Cetirizine',     expiryDate: 'Mar 20, 2026', daysLeft:  20, stock: 50 },
  { name: 'Ibuprofen',      expiryDate: 'Jan 10, 2026', daysLeft: -49, stock:  8 },
];

/**
 * Returns a severity label + color classes based on days until expiry.
 *
 *  daysLeft < 0   → already expired  (red)
 *  daysLeft = 0   → expires today    (red)
 *  1 – 7          → critical         (red/orange)
 *  8 – 30         → expiring soon    (amber)
 *  31 – 90        → heads up         (yellow)
 */
function getExpiryStatus(daysLeft: number): { label: string; badge: string; row: string } {
  if (daysLeft < 0)  return { label: 'Expired',        badge: 'bg-red-100    text-red-700',    row: 'bg-red-50/40'    };
  if (daysLeft === 0) return { label: 'Expires Today',  badge: 'bg-red-100    text-red-700',    row: 'bg-red-50/40'    };
  if (daysLeft <= 7)  return { label: `${daysLeft}d left`, badge: 'bg-orange-100 text-orange-700', row: 'bg-orange-50/30' };
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, badge: 'bg-amber-100  text-amber-700',  row: 'bg-amber-50/20'  };
  return                     { label: `${daysLeft}d left`, badge: 'bg-yellow-100 text-yellow-700', row: ''               };
}

/** Human-readable "expires in X days" text shown under the medicine name */
function expirySubtext(daysLeft: number, expiryDate: string): string {
  if (daysLeft < 0)  return `Expired ${Math.abs(daysLeft)} days ago · ${expiryDate}`;
  if (daysLeft === 0) return `Expires today · ${expiryDate}`;
  return `Expires ${expiryDate} · ${daysLeft} days left`;
}

// ── Sub-components ────────────────────────────────────────────

/** Formats today's date as "Wednesday, February 28, 2026" */
function TodayDate() {
  const now  = new Date();
  const long = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
  return <span className="text-sm text-gray-400">{long}</span>;
}

// ── Main Page ─────────────────────────────────────────────────

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { role } = await params;
  if (!VALID_ROLES.includes(role)) redirect('/login');

  return (
    <div className="p-6 md:p-8 space-y-6">

      {/* ── Section 1: Page Header ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <TodayDate />
        </div>
        {/* Action buttons — only shown for staff role */}
        {role === 'staff' && (
          <div className="flex flex-wrap items-center gap-3">
            <button className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Consultation
            </button>
            <button className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-600 text-sm font-semibold px-4 py-2 rounded-xl transition-colors bg-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Register Student
            </button>
            <Link
              href="/dashboard/staff/scanner"
              className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-600 text-sm font-semibold px-4 py-2 rounded-xl transition-colors bg-white"
            >
              {/* QR scanner icon */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9V5a2 2 0 0 1 2-2h4" />
                <path d="M15 3h4a2 2 0 0 1 2 2v4" />
                <path d="M21 15v4a2 2 0 0 1-2 2h-4" />
                <path d="M9 21H5a2 2 0 0 1-2-2v-4" />
                <rect x="7" y="7" width="3" height="3" rx="0.5" />
                <rect x="14" y="7" width="3" height="3" rx="0.5" />
                <rect x="7" y="14" width="3" height="3" rx="0.5" />
              </svg>
              Scan Student
            </Link>
          </div>
        )}
      </div>

      {/* ── Section 2: Stat Cards ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, change, positive, icon, iconBg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
                {icon}
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
            <p className={`text-xs font-medium ${positive ? 'text-teal-500' : 'text-amber-500'}`}>
              {change}
            </p>
          </div>
        ))}
      </div>

      {/* ── Section 3: Consultation Trend Chart (AI Insight) */}
      {/*
        This is a CLIENT component — it holds the tab state
        (Daily / Weekly / Monthly) and renders the recharts chart.
        The AI insight is auto-generated from the selected dataset.
      */}
      <ConsultationTrendChart />

      {/* ── Section 4: Recent Consultations + Illnesses ──── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent Consultations table — takes 2/3 width on xl */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900">Recent Consultations</h3>
          </div>
          {/* overflow-x-auto lets the table scroll horizontally on small screens */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-xs text-gray-400 font-semibold border-b border-gray-100">
                  <th className="px-4 sm:px-6 py-3 text-left">Student</th>
                  <th className="px-4 sm:px-6 py-3 text-left">Date</th>
                  <th className="px-4 sm:px-6 py-3 text-left">Diagnosis</th>
                  <th className="px-4 sm:px-6 py-3 text-left">Staff</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_CONSULTATIONS.map(({ student, date, diagnosis, staff }, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-3 font-medium text-gray-800 whitespace-nowrap">{student}</td>
                    <td className="px-4 sm:px-6 py-3 text-gray-500 whitespace-nowrap">{date}</td>
                    <td className="px-4 sm:px-6 py-3 text-gray-600">{diagnosis}</td>
                    <td className="px-4 sm:px-6 py-3 text-gray-500 whitespace-nowrap">{staff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Common Illnesses bar chart — takes 1/3 width */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-5">
            Common Illnesses <span className="text-xs font-normal text-gray-400">(This Month)</span>
          </h3>

          {/* Simple CSS bar chart — no library needed for this one */}
          <div className="flex items-end justify-between gap-2 h-36 mb-3">
            {COMMON_ILLNESSES.map(({ name, pct }) => (
              <div key={name} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className="w-full bg-teal-400 rounded-t-md transition-all"
                  style={{ height: `${pct}%` }}
                />
              </div>
            ))}
          </div>
          {/* X-axis labels */}
          <div className="flex justify-between gap-2">
            {COMMON_ILLNESSES.map(({ name }) => (
              <p key={name} className="flex-1 text-center text-[10px] text-gray-400 truncate">
                {name}
              </p>
            ))}
          </div>
        </div>

      </div>

      {/* ── Section 5: Inventory Alerts (Stock + Expiry) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">

        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Inventory Alerts</h3>
          <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-lg">
            {STOCK_ALERTS.length + EXPIRY_ALERTS.length} issues
          </span>
        </div>

        {/* ── Sub-section A: Stock Issues ──────────────────── */}
        <div className="px-6 pt-4 pb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Stock Issues</p>
        </div>
        <div className="divide-y divide-gray-50">
          {STOCK_ALERTS.map(({ name, remaining, status, statusColor }) => (
            <div key={name} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  {/* Box / stock icon */}
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{name}</p>
                  <p className="text-xs text-gray-400">{remaining}</p>
                </div>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor}`}>
                {status}
              </span>
            </div>
          ))}
        </div>

        {/* ── Sub-section B: Expiry Alerts ─────────────────── */}
        <div className="px-4 sm:px-6 pt-5 pb-2 border-t border-gray-100 mt-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Expiry Alerts</p>
        </div>
        <div className="divide-y divide-gray-50 pb-2">
          {EXPIRY_ALERTS.map(({ name, expiryDate, daysLeft, stock }) => {
            const { label, badge, row } = getExpiryStatus(daysLeft);
            return (
              <div key={name} className={`flex items-center justify-between px-4 sm:px-6 py-3.5 ${row}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {/* Calendar / expiry icon — red if expired/critical, amber if warning */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    daysLeft <= 7 ? 'bg-red-50' : 'bg-amber-50'
                  }`}>
                    <svg className={`w-5 h-5 ${
                      daysLeft <= 7 ? 'text-red-500' : 'text-amber-500'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                    <p className="text-xs text-gray-400">{expirySubtext(daysLeft, expiryDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                  <span className="hidden sm:inline text-xs text-gray-400">{stock} units</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${badge}`}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 rounded-b-2xl border-t border-gray-100">
          <p className="text-[11px] text-gray-400">
            ⚡ Expiry alerts are sorted by urgency. Expired or critical items should be
            removed from the shelf immediately and flagged for disposal.
          </p>
        </div>

      </div>

    </div>
  );
}
