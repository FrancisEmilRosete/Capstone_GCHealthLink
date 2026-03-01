/**
 * NOTIFICATIONS PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /dashboard/staff/notifications
 * TODO: Replace MOCK_ALERTS with GET /api/notifications
 */

'use client';

import { useState } from 'react';

// ── Types ───────────────────────────────────────────────────
type Level = 'critical' | 'warning' | 'info';
type Category = 'trend' | 'medicine' | 'stock' | 'activity';

interface Alert {
  id:       string;
  level:    Level;
  category: Category;
  title:    string;
  message:  string;
  time:     string; // relative label
  read:     boolean;
}

// ── Mock alerts ───────────────────────────────────────────────
 const INITIAL_ALERTS: Alert[] = [
  // Trends
  { id: 'a1', level: 'critical', category: 'trend',    title: 'Flu Outbreak Trend Detected',           message: '8 students consulted with flu symptoms in the past 7 days. Consider campus-wide advisory.', time: '2 hours ago', read: false },
  { id: 'a2', level: 'warning',  category: 'trend',    title: 'Gastritis Cases Increasing',            message: '4 gastritis cases this week, higher than the monthly average of 1.5/week.', time: '1 day ago', read: false },
  { id: 'a3', level: 'info',     category: 'trend',    title: 'Hypertension Cases This Semester',      message: '3 hypertension-related consultations recorded. Monitor BP regularly during enrollment week.', time: '3 days ago', read: true },
  // Medicine expiry
  { id: 'a4', level: 'critical', category: 'medicine', title: 'Mefenamic Acid — Expired',              message: 'Mefenamic Acid (20 capsules) expired on Dec 1, 2023. Remove from dispensing stock immediately.', time: '5 days ago', read: false },
  { id: 'a5', level: 'critical', category: 'medicine', title: 'Amoxicillin — Expired',                 message: 'Amoxicillin (0 capsules) expired on May 20, 2024. Dispose of properly.', time: '5 days ago', read: true },
  { id: 'a6', level: 'warning',  category: 'medicine', title: 'Neozep — Expiring Soon',               message: 'Neozep expires on Oct 15, 2024. Only 45 tablets remaining. Reorder and plan disposal.', time: '1 week ago', read: true },
  // Low stock
  { id: 'a7', level: 'warning',  category: 'stock',    title: 'Neozep — Low Stock',                   message: 'Only 45 tablets of Neozep remaining. Reorder threshold is 50 units. Place a restock order.', time: '1 week ago', read: false },
  { id: 'a8', level: 'warning',  category: 'stock',    title: 'Salbutamol Inhaler — Low Stock',        message: 'Only 30 puffs remaining. Asthma season approaching. Reorder recommended.', time: '2 weeks ago', read: true },
  // Activity
  { id: 'a9', level: 'info',     category: 'activity', title: 'New Certificate Issued',                message: 'Medical excuse letter issued to Carlos Reyes (2024-0010) for hypertension episode.', time: '3 hours ago', read: false },
  { id:'a10', level: 'info',     category: 'activity', title: 'Physical Exam Recorded',                message: 'Physical examination completed for Juan Dela Cruz (2023-0001) by Dr. Maria Santos.', time: '1 day ago', read: true },
];

// ── Helpers ─────────────────────────────────────────────────
const LEVEL_STYLE: Record<Level, { badge: string; icon: string; border: string }> = {
  critical: { badge: 'bg-red-50 text-red-500 border-red-100',     icon: 'text-red-400',    border: 'border-l-red-400'    },
  warning:  { badge: 'bg-yellow-50 text-yellow-600 border-yellow-100', icon: 'text-yellow-400', border: 'border-l-yellow-400' },
  info:     { badge: 'bg-blue-50 text-blue-500 border-blue-100',   icon: 'text-blue-400',   border: 'border-l-blue-400'   },
};

const CATEGORY_LABEL: Record<Category, string> = {
  trend:    'Health Trend',
  medicine: 'Medicine Expiry',
  stock:    'Low Stock',
  activity: 'Recent Activity',
};

const CATEGORY_ORDER: Category[] = ['trend','medicine','stock','activity'];

function AlertIcon({ level }: { level: Level }) {
  if (level === 'critical' || level === 'warning') return (
    <svg className={`w-5 h-5 shrink-0 ${LEVEL_STYLE[level].icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    </svg>
  );
  return (
    <svg className={`w-5 h-5 shrink-0 ${LEVEL_STYLE['info'].icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [filter, setFilter] = useState<'all' | Category>('all');

  const unread = alerts.filter((a) => !a.read).length;

  function markAllRead() { setAlerts((prev) => prev.map((a) => ({ ...a, read: true }))); }
  function markRead(id: string) { setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a)); }
  function dismiss(id: string) { setAlerts((prev) => prev.filter((a) => a.id !== id)); }

  const displayed = filter === 'all' ? alerts : alerts.filter((a) => a.category === filter);

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            <p className="text-xs text-gray-400 mt-0.5">Alerts, trends, and system activity</p>
          </div>
          {unread > 0 && (
            <span className="text-xs font-bold bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0">{unread}</span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs font-semibold text-teal-500 hover:underline">Mark all as read</button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['all', ...CATEGORY_ORDER] as const).map((cat) => {
          const label = cat === 'all' ? 'All' : CATEGORY_LABEL[cat];
          const count = cat === 'all' ? alerts.filter((a)=>!a.read).length : alerts.filter((a)=>a.category===cat&&!a.read).length;
          return (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filter === cat ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {label}
              {count > 0 && <span className="w-4 h-4 rounded-full bg-red-400 text-white text-[10px] font-bold flex items-center justify-center">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400 text-sm">No notifications in this category.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {CATEGORY_ORDER.filter((cat) => filter === 'all' || filter === cat).map((cat) => {
            const group = displayed.filter((a) => a.category === cat);
            if (group.length === 0) return null;
            return (
              <div key={cat}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">{CATEGORY_LABEL[cat]}</p>
                <div className="space-y-2">
                  {group.map((a) => (
                    <div key={a.id}
                      className={`bg-white rounded-xl border border-l-4 shadow-sm p-4 flex items-start gap-3 transition-opacity ${
                        a.read ? 'opacity-60' : ''
                      } ${LEVEL_STYLE[a.level].border} border-gray-100`}>
                      <AlertIcon level={a.level}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-bold ${a.read ? 'text-gray-500' : 'text-gray-800'}`}>{a.title}</p>
                          <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full shrink-0 ${LEVEL_STYLE[a.level].badge}`}>
                            {a.level.charAt(0).toUpperCase() + a.level.slice(1)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{a.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <p className="text-[11px] text-gray-400">{a.time}</p>
                          {!a.read && (
                            <button onClick={() => markRead(a.id)} className="text-[11px] text-teal-500 font-semibold hover:underline">Mark read</button>
                          )}
                          <button onClick={() => dismiss(a.id)} className="text-[11px] text-gray-400 hover:text-red-400 font-semibold hover:underline">Dismiss</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
