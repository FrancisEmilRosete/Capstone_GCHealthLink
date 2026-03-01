'use client';

/**
 * ADMIN NOTIFICATIONS
 * Route: /dashboard/admin/notifications
 */

import { useState } from 'react';

interface AdminAlert {
  id:       number;
  level:    'critical' | 'warning' | 'info';
  category: 'health' | 'inventory' | 'system' | 'activity';
  title:    string;
  message:  string;
  time:     string;
  read:     boolean;
}

const INITIAL_ALERTS: AdminAlert[] = [
  {
    id: 1, level: 'critical', category: 'health', read: false,
    title: 'High Visit Volume Alert',
    message: 'Today\'s visits (28) have exceeded the daily average of 18. Clinic may need additional staffing.',
    time: '8:00 AM',
  },
  {
    id: 2, level: 'warning', category: 'inventory', read: false,
    title: 'Amoxicillin Running Low',
    message: 'Amoxicillin stock is at 12 units — below the 50-unit threshold. Please coordinate a restock.',
    time: '8:30 AM',
  },
  {
    id: 3, level: 'critical', category: 'inventory', read: false,
    title: 'Salbutamol Out of Stock',
    message: 'Salbutamol inhaler stock is at 0 units. Students with asthma are without emergency medication.',
    time: '9:00 AM',
  },
  {
    id: 4, level: 'info', category: 'activity', read: false,
    title: 'Monthly Report Generated',
    message: 'February 2026 monthly consultation report has been automatically generated and is available for download.',
    time: '9:15 AM',
  },
  {
    id: 5, level: 'warning', category: 'health', read: false,
    title: 'Flu Trend Detected — Engineering Dept',
    message: 'A cluster of 7 flu cases from the College of Engineering has been recorded this week.',
    time: '10:00 AM',
  },
  {
    id: 6, level: 'info', category: 'system', read: true,
    title: 'New Student Registration',
    message: 'Maria Santos (2026-0088) completed health registration and is pending clinic verification.',
    time: '10:30 AM',
  },
  {
    id: 7, level: 'warning', category: 'inventory', read: true,
    title: 'Biogesic Expiring Soon',
    message: '3 boxes of Biogesic (Paracetamol 500mg) expire within 30 days on April 1, 2026.',
    time: 'Yesterday',
  },
  {
    id: 8, level: 'info', category: 'system', read: true,
    title: 'Staff Account Created',
    message: 'Doctor Maria Santos\' staff account has been successfully created and is now active.',
    time: 'Yesterday',
  },
  {
    id: 9, level: 'info', category: 'activity', read: true,
    title: '15 Physical Exams Pending',
    message: '15 enrolled students have not yet completed their annual physical examination.',
    time: '2 days ago',
  },
  {
    id: 10, level: 'critical', category: 'health', read: true,
    title: 'Dengue Suspected Case',
    message: 'A suspected dengue case (Student ID: 2024-0045) was recorded. Preventive alert issued.',
    time: '3 days ago',
  },
];

const TABS = [
  { id: 'all',       label: 'All',             cat: null },
  { id: 'health',    label: 'Health Trends',   cat: 'health' },
  { id: 'inventory', label: 'Inventory',        cat: 'inventory' },
  { id: 'system',    label: 'System',           cat: 'system' },
  { id: 'activity',  label: 'Activity',         cat: 'activity' },
];

const LEVEL_STYLE: Record<string, { border: string; badge: string; dot: string }> = {
  critical: { border: 'border-l-red-500',    badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500'    },
  warning:  { border: 'border-l-amber-500',  badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  info:     { border: 'border-l-blue-400',   badge: 'bg-blue-100 text-blue-700',  dot: 'bg-blue-400'   },
};

export default function AdminNotifications() {
  const [alerts, setAlerts] = useState<AdminAlert[]>(INITIAL_ALERTS);
  const [activeTab, setActiveTab] = useState('all');

  const filtered = activeTab === 'all'
    ? alerts
    : alerts.filter(a => a.category === TABS.find(t => t.id === activeTab)?.cat);

  const unreadCount = (cat: string | null) =>
    alerts.filter(a => !a.read && (cat === null || a.category === cat)).length;

  function markRead(id: number) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  }

  function dismiss(id: number) {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  function markAllRead() {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  }

  const totalUnread = alerts.filter(a => !a.read).length;

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalUnread > 0 ? `${totalUnread} unread alert${totalUnread > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {totalUnread > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => {
          const count = unreadCount(tab.cat);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
              {count > 0 && (
                <span className="text-[10px] bg-teal-500 text-white font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
          No notifications in this category.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(alert => {
            const style = LEVEL_STYLE[alert.level];
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl border border-l-4 border-gray-100 ${style.border} shadow-sm p-4
                  ${alert.read ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${alert.read ? 'bg-gray-300' : style.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{alert.title}</p>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${style.badge}`}>
                        {alert.level}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1.5">{alert.time}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!alert.read && (
                      <button
                        onClick={() => markRead(alert.id)}
                        className="text-xs text-teal-600 hover:bg-teal-50 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => dismiss(alert.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
