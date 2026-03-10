'use client';

import { useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface AdminAlert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  category: 'health' | 'inventory' | 'system' | 'activity';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface AdvisoryItem {
  id: string;
  title: string;
  message: string;
  severity: string;
  createdAt: string;
}

interface AdvisoryResponse {
  success: boolean;
  data: AdvisoryItem[];
}

interface InventoryItem {
  id: string;
  itemName: string;
  currentStock: number;
  reorderThreshold: number;
  unit: string;
}

interface InventoryResponse {
  success: boolean;
  data: InventoryItem[];
}

interface AnalyticsResponse {
  success: boolean;
  data: {
    totalVisits: number;
    topConcerns: Array<{ issue: string; count: number }>;
    departmentHeatmap: Record<string, number>;
    outbreakWatch: string | Array<{ level: string; message: string; cases: number }>;
  };
}

interface BroadcastResponse {
  success: boolean;
  message: string;
}

const TABS = [
  { id: 'all', label: 'All', cat: null },
  { id: 'health', label: 'Health Trends', cat: 'health' },
  { id: 'inventory', label: 'Inventory', cat: 'inventory' },
  { id: 'system', label: 'System', cat: 'system' },
  { id: 'activity', label: 'Activity', cat: 'activity' },
] as const;

const LEVEL_STYLE: Record<string, { border: string; badge: string; dot: string }> = {
  critical: { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  warning: { border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  info: { border: 'border-l-blue-400', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
};

function toLevel(severity: string): AdminAlert['level'] {
  const normalized = severity.toUpperCase();
  if (normalized === 'CRITICAL') return 'critical';
  if (normalized === 'WARNING') return 'warning';
  return 'info';
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminNotifications() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastDept, setBroadcastDept] = useState('ALL');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('INFO');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState('');

  async function loadAlerts() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      const [advisoriesResponse, inventoryResponse, analyticsResponse] = await Promise.all([
        api.get<AdvisoryResponse>('/advisories', token),
        api.get<InventoryResponse>('/inventory', token),
        api.get<AnalyticsResponse>('/admin/analytics', token),
      ]);

      const advisoryAlerts: AdminAlert[] = (advisoriesResponse.data || []).map((advisory) => ({
        id: `advisory-${advisory.id}`,
        level: toLevel(advisory.severity),
        category: 'activity',
        title: advisory.title,
        message: advisory.message,
        time: formatTime(advisory.createdAt),
        read: false,
      }));

      const inventoryAlerts: AdminAlert[] = (inventoryResponse.data || [])
        .filter((item) => item.currentStock <= item.reorderThreshold)
        .map((item) => ({
          id: `inventory-${item.id}`,
          level: item.currentStock === 0 ? 'critical' : 'warning',
          category: 'inventory',
          title: `${item.itemName} ${item.currentStock === 0 ? 'Out of Stock' : 'Below Threshold'}`,
          message: `Current stock: ${item.currentStock} ${item.unit}. Reorder threshold: ${item.reorderThreshold}.`,
          time: 'Inventory signal',
          read: false,
        }));

      const analytics = analyticsResponse.data;
      const healthAlerts: AdminAlert[] = [];

      if (typeof analytics.outbreakWatch === 'string') {
        healthAlerts.push({
          id: 'outbreak-green',
          level: 'info',
          category: 'health',
          title: 'Outbreak Watch Status',
          message: analytics.outbreakWatch,
          time: 'Latest analytics run',
          read: false,
        });
      } else {
        for (const item of analytics.outbreakWatch) {
          const mappedLevel = item.level === 'RED'
            ? 'critical'
            : item.level === 'YELLOW'
              ? 'warning'
              : 'info';

          healthAlerts.push({
            id: `outbreak-${item.level}-${item.cases}-${item.message.slice(0, 12)}`,
            level: mappedLevel,
            category: 'health',
            title: `Outbreak Watch: ${item.level}`,
            message: `${item.message} Cases: ${item.cases}.`,
            time: 'Latest analytics run',
            read: false,
          });
        }
      }

      const systemAlerts: AdminAlert[] = (analytics.topConcerns || []).slice(0, 4).map((concern, index) => ({
        id: `system-concern-${index}`,
        level: 'info',
        category: 'system',
        title: 'Top Concern Snapshot',
        message: `${concern.issue || 'General consultation'} has ${concern.count} recorded visits.`,
        time: 'Analytics summary',
        read: false,
      }));

      setAlerts([...healthAlerts, ...inventoryAlerts, ...advisoryAlerts, ...systemAlerts]);
      setError('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load admin notifications.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAlerts();
  }, []);

  async function handleBroadcastSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    const title = broadcastTitle.trim();
    const message = broadcastMessage.trim();
    const targetDept = broadcastDept.trim() || 'ALL';

    if (!title || !message) {
      setBroadcastFeedback('Title and message are required before broadcasting.');
      return;
    }

    try {
      setSendingBroadcast(true);
      setBroadcastFeedback('');
      setError('');

      const response = await api.post<BroadcastResponse>(
        '/advisories/broadcast',
        {
          title,
          message,
          targetDept,
          severity: broadcastSeverity,
        },
        token,
      );

      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastFeedback(response.message || 'Advisory broadcast sent successfully.');
      await loadAlerts();
    } catch (err) {
      if (err instanceof ApiError) {
        setBroadcastFeedback(err.message);
      } else {
        setBroadcastFeedback('Failed to send advisory broadcast.');
      }
    } finally {
      setSendingBroadcast(false);
    }
  }

  const filtered = useMemo(() => {
    if (activeTab === 'all') return alerts;
    return alerts.filter((item) => item.category === TABS.find((tab) => tab.id === activeTab)?.cat);
  }, [alerts, activeTab]);

  const unreadCount = (cat: string | null) => alerts.filter((item) => !item.read && (cat === null || item.category === cat)).length;

  function markRead(id: string) {
    setAlerts((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }

  function dismiss(id: string) {
    setAlerts((prev) => prev.filter((item) => item.id !== id));
  }

  function markAllRead() {
    setAlerts((prev) => prev.map((item) => ({ ...item, read: true })));
  }

  const totalUnread = alerts.filter((item) => !item.read).length;

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
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
            className="text-sm text-teal-600 hover:text-teal-700 font-medium bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl"
          >
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Broadcast Health Advisory</h2>
          <p className="text-xs text-gray-500 mt-0.5">Phase 6 intervention: push alerts to all users or a specific department.</p>
        </div>

        <form onSubmit={(event) => { void handleBroadcastSubmit(event); }} className="space-y-2.5">
          <input
            type="text"
            value={broadcastTitle}
            onChange={(event) => setBroadcastTitle(event.target.value)}
            placeholder="Advisory title"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={broadcastDept}
              onChange={(event) => setBroadcastDept(event.target.value.toUpperCase())}
              placeholder="Target department (ALL, BSCS, BSIT...)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <select
              value={broadcastSeverity}
              onChange={(event) => setBroadcastSeverity(event.target.value as 'INFO' | 'WARNING' | 'CRITICAL')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <textarea
            rows={3}
            value={broadcastMessage}
            onChange={(event) => setBroadcastMessage(event.target.value)}
            placeholder="Advisory message to students and staff"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
          />

          <div className="flex items-center justify-between gap-3">
            {broadcastFeedback ? (
              <p className={`text-xs ${broadcastFeedback.toLowerCase().includes('failed') || broadcastFeedback.toLowerCase().includes('required') ? 'text-red-600' : 'text-teal-600'}`}>
                {broadcastFeedback}
              </p>
            ) : <span className="text-xs text-gray-400">Broadcasts are audit-tracked in the backend.</span>}

            <button
              type="submit"
              disabled={sendingBroadcast}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-70"
            >
              {sendingBroadcast ? 'Sending...' : 'Broadcast Advisory'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const count = unreadCount(tab.cat);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
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

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
          Loading notifications...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
          No notifications in this category.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((alert) => {
            const style = LEVEL_STYLE[alert.level];
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl border border-l-4 border-gray-100 ${style.border} shadow-sm p-4 ${alert.read ? 'opacity-70' : ''}`}
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
                        className="text-xs text-teal-600 hover:bg-teal-50 px-2.5 py-1.5 rounded-lg font-medium"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => dismiss(alert.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
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
