'use client';

import { useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

type Level = 'critical' | 'warning' | 'info';
type Category = 'appointments' | 'stock';

interface Alert {
  id: string;
  level: Level;
  category: Category;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface QueueItem {
  id: string;
  preferredDate: string;
  preferredTime: string;
  symptoms: string;
  studentProfile: {
    studentNumber: string;
    firstName: string;
    lastName: string;
    courseDept: string;
  };
}

interface QueueResponse {
  success: boolean;
  data: QueueItem[];
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

interface NotificationStateResponse {
  success: boolean;
  data: {
    readIds: string[];
    dismissedIds: string[];
  };
}

const LEVEL_STYLE: Record<Level, { badge: string; icon: string; border: string }> = {
  critical: { badge: 'bg-red-50 text-red-500 border-red-100', icon: 'text-red-400', border: 'border-l-red-400' },
  warning: { badge: 'bg-yellow-50 text-yellow-600 border-yellow-100', icon: 'text-yellow-400', border: 'border-l-yellow-400' },
  info: { badge: 'bg-blue-50 text-blue-500 border-blue-100', icon: 'text-blue-400', border: 'border-l-blue-400' },
};

const CATEGORY_LABEL: Record<Category, string> = {
  appointments: 'New Appointments',
  stock: 'Low Inventory',
};

const CATEGORY_ORDER: Category[] = ['appointments', 'stock'];

function formatDateTime(dateIso: string, preferredTime?: string) {
  const date = new Date(dateIso);
  const dateLabel = Number.isNaN(date.getTime())
    ? dateIso
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (preferredTime && preferredTime.trim()) {
    return `${dateLabel} at ${preferredTime.trim()}`;
  }

  return dateLabel;
}

function AlertIcon({ level }: { level: Level }) {
  if (level === 'critical' || level === 'warning') {
    return (
      <svg className={`w-5 h-5 shrink-0 ${LEVEL_STYLE[level].icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    );
  }

  return (
    <svg className={`w-5 h-5 shrink-0 ${LEVEL_STYLE.info.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function DoctorNotificationsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function persistState(nextAlerts: Alert[], nextDismissedIds: string[]) {
    const token = getToken();
    if (!token) return;

    try {
      await api.put(
        '/advisories/state',
        {
          readIds: nextAlerts.filter((item) => item.read).map((item) => item.id),
          dismissedIds: nextDismissedIds,
        },
        token,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to persist notification state.');
      }
    }
  }

  async function loadAlerts() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      const [queueResponse, inventoryResponse, stateResponse] = await Promise.all([
        api.get<QueueResponse>('/appointments/queue?limit=500', token),
        api.get<InventoryResponse>('/inventory', token),
        api.get<NotificationStateResponse>('/advisories/state', token),
      ]);

      const readSet = new Set(stateResponse.data?.readIds || []);
      const dismissed = stateResponse.data?.dismissedIds || [];
      const dismissedSet = new Set(dismissed);

      const appointmentAlerts: Alert[] = (queueResponse.data || []).map((item) => {
        const studentName = `${item.studentProfile.lastName}, ${item.studentProfile.firstName}`;
        const scheduleLabel = formatDateTime(item.preferredDate, item.preferredTime);
        const symptomText = item.symptoms?.trim() || 'No symptoms provided.';

        return {
          id: `appointment-${item.id}`,
          level: 'info',
          category: 'appointments',
          title: `New Appointment: ${studentName}`,
          message: `${item.studentProfile.studentNumber} (${item.studentProfile.courseDept || 'N/A'}) requested ${scheduleLabel}. Symptoms: ${symptomText}`,
          time: scheduleLabel,
          read: false,
        };
      });

      const inventoryAlerts: Alert[] = (inventoryResponse.data || [])
        .filter((item) => item.currentStock <= item.reorderThreshold)
        .map((item) => ({
          id: `stock-${item.id}`,
          level: item.currentStock === 0 ? 'critical' : 'warning',
          category: 'stock',
          title: `${item.itemName} ${item.currentStock === 0 ? 'Out of Stock' : 'Low Stock'}`,
          message: `Current stock is ${item.currentStock} ${item.unit}. Reorder threshold is ${item.reorderThreshold}.`,
          time: 'Inventory update',
          read: false,
        }));

      const hydratedAlerts = [...appointmentAlerts, ...inventoryAlerts]
        .filter((item) => !dismissedSet.has(item.id))
        .map((item) => ({
          ...item,
          read: readSet.has(item.id),
        }));

      setAlerts(hydratedAlerts);
      setDismissedIds(dismissed);
      setError('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load notifications.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAlerts();
  }, []);

  const unread = alerts.filter((item) => !item.read).length;

  function markAllRead() {
    setAlerts((prev) => {
      const next = prev.map((item) => ({ ...item, read: true }));
      void persistState(next, dismissedIds);
      return next;
    });
  }

  function markRead(id: string) {
    setAlerts((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, read: true } : item));
      void persistState(next, dismissedIds);
      return next;
    });
  }

  function dismiss(id: string) {
    setAlerts((prev) => {
      const next = prev.filter((item) => item.id !== id);
      const nextDismissedIds = Array.from(new Set([...dismissedIds, id]));
      setDismissedIds(nextDismissedIds);
      void persistState(next, nextDismissedIds);
      return next;
    });
  }

  const displayed = useMemo(() => {
    return filter === 'all' ? alerts : alerts.filter((item) => item.category === filter);
  }, [alerts, filter]);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Doctor Notifications</h1>
            <p className="text-xs text-gray-400 mt-0.5">Operational alerts for appointments and clinic readiness</p>
          </div>
          {unread > 0 && (
            <span className="text-xs font-bold bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs font-semibold text-teal-500 hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['all', ...CATEGORY_ORDER] as const).map((category) => {
          const label = category === 'all' ? 'All' : CATEGORY_LABEL[category];
          const count = category === 'all'
            ? alerts.filter((item) => !item.read).length
            : alerts.filter((item) => item.category === category && !item.read).length;

          return (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filter === category ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {count > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-400 text-white text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
          Loading notifications...
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
          No notifications in this category.
        </div>
      ) : (
        <div className="space-y-2">
          {CATEGORY_ORDER.filter((category) => filter === 'all' || filter === category).map((category) => {
            const group = displayed.filter((item) => item.category === category);
            if (group.length === 0) return null;

            return (
              <div key={category}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">
                  {CATEGORY_LABEL[category]}
                </p>
                <div className="space-y-2">
                  {group.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white rounded-xl border border-l-4 shadow-sm p-4 flex items-start gap-3 ${
                        item.read ? 'opacity-60' : ''
                      } ${LEVEL_STYLE[item.level].border} border-gray-100`}
                    >
                      <AlertIcon level={item.level} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-bold ${item.read ? 'text-gray-500' : 'text-gray-800'}`}>{item.title}</p>
                          <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full shrink-0 ${LEVEL_STYLE[item.level].badge}`}>
                            {item.level.charAt(0).toUpperCase() + item.level.slice(1)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <p className="text-[11px] text-gray-400">{item.time}</p>
                          {!item.read && (
                            <button onClick={() => markRead(item.id)} className="text-[11px] text-teal-500 font-semibold hover:underline">
                              Mark read
                            </button>
                          )}
                          <button onClick={() => dismiss(item.id)} className="text-[11px] text-gray-400 hover:text-red-400 font-semibold hover:underline">
                            Dismiss
                          </button>
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
