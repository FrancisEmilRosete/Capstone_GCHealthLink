'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, FileText, Calendar, Package } from 'lucide-react';
import type { PendingCertificateRequest } from '@/components/dashboard/staff/CertificateApprovalTable';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatTime12Hour } from '@/lib/time';

type Level = 'critical' | 'warning' | 'info';
type Category = 'appointments' | 'stock' | 'certificates';

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
  expirationDate?: string | null;
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

const CERT_STORAGE_KEY = 'gchl_cert_requests';

function formatDateTime(dateIso: string, preferredTime?: string) {
  const date = new Date(dateIso);
  const dateLabel = Number.isNaN(date.getTime())
    ? dateIso
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (preferredTime && preferredTime.trim()) {
    return `${dateLabel} at ${formatTime12Hour(preferredTime.trim())}`;
  }

  return dateLabel;
}

export default function DoctorNotificationsBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    } catch {
      // Ignore
    }
  }

  async function loadAlerts() {
    const token = getToken();
    if (!token) return;

    try {
      const [queueResponse, inventoryResponse, stateResponse] = await Promise.allSettled([
        api.get<QueueResponse>('/appointments/queue?limit=500', token),
        api.get<InventoryResponse>('/inventory', token),
        api.get<NotificationStateResponse>('/advisories/state', token),
      ]);

      const readSet = new Set(stateResponse.status === 'fulfilled' ? (stateResponse.value.data?.readIds || []) : []);
      const dismissed = stateResponse.status === 'fulfilled' ? (stateResponse.value.data?.dismissedIds || []) : [];
      const dismissedSet = new Set(dismissed);
      const rawCerts = localStorage.getItem(CERT_STORAGE_KEY);
      const parsedCerts: PendingCertificateRequest[] = rawCerts ? JSON.parse(rawCerts) : [];
      const pendingCerts = parsedCerts.filter((item) => item.status === 'pending_doctor');

      const appointmentAlerts: Alert[] = queueResponse.status === 'fulfilled' ? (queueResponse.value.data || []).map((item) => {
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
      }) : [];

      const certificateAlerts: Alert[] = pendingCerts.map((cert) => ({
        id: `certificate-${cert.id}`,
        level: 'warning',
        category: 'certificates',
        title: `Certificate Approval Needed: ${cert.studentName}`,
        message: `${cert.studentNumber} (${cert.courseDept || 'N/A'}) requested a medical certificate for ${cert.reason}.`,
        time: formatDateTime(cert.requestedDateIso),
        read: false,
      }));

      const now = new Date();
      const inventoryAlerts: Alert[] = inventoryResponse.status === 'fulfilled' ? (inventoryResponse.value.data || [])
        .map((item) => {
          const hasExpiration = Boolean(item.expirationDate);
          const expirationDate = hasExpiration ? new Date(item.expirationDate as string) : null;
          const isExpired = Boolean(expirationDate && !Number.isNaN(expirationDate.getTime()) && expirationDate < now);
          const isOutOfStock = item.currentStock === 0;

          if (!isOutOfStock && !isExpired) return null;

          let title = `${item.itemName} Alert`;
          if (isOutOfStock && isExpired) title = `${item.itemName} Out of Stock and Expired`;
          else if (isOutOfStock) title = `${item.itemName} Out of Stock`;
          else if (isExpired) title = `${item.itemName} Expired`;

          const expiryText = expirationDate && !Number.isNaN(expirationDate.getTime())
            ? expirationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'N/A';

          return {
            id: `stock-${item.id}`,
            level: isOutOfStock || isExpired ? 'critical' : 'warning',
            category: 'stock',
            title,
            message: `Current stock is ${item.currentStock} ${item.unit}. Reorder threshold is ${item.reorderThreshold}. Expiration date: ${expiryText}.`,
            time: 'Inventory update',
            read: false,
          } as Alert;
        })
        .filter((item): item is Alert => item !== null) : [];

      const hydratedAlerts = [...certificateAlerts, ...appointmentAlerts, ...inventoryAlerts]
        .filter((item) => !dismissedSet.has(item.id))
        .map((item) => ({
          ...item,
          read: readSet.has(item.id),
        }));

      setAlerts(hydratedAlerts);
      setDismissedIds(dismissed);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAlerts();

    const interval = setInterval(() => {
      void loadAlerts();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = alerts.filter((item) => !item.read).length;

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

  return (
    <div ref={containerRef} className="relative z-30">
      {/* Trigger Bell Button */}
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-700 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Box */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-teal-500/10 text-teal-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-all"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Loading notifications...
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 text-gray-300" />
                <p>No new notifications available.</p>
              </div>
            ) : (
              alerts.map((item) => {
                const isCrit = item.level === 'critical';
                const isWarn = item.level === 'warning';

                const badgeStyle = isCrit
                  ? 'bg-red-50 text-red-600 border-red-100'
                  : isWarn
                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                    : 'bg-blue-50 text-blue-600 border-blue-100';

                return (
                  <div
                    key={item.id}
                    className={`p-4 transition-colors relative hover:bg-gray-50 ${
                      !item.read ? 'bg-teal-500/[0.02]' : 'opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Left Icon */}
                      <div className="mt-0.5 shrink-0">
                        {item.category === 'certificates' ? (
                          <div className={`p-2 rounded-xl bg-amber-100 text-amber-500`}>
                            <FileText className="w-4 h-4" />
                          </div>
                        ) : item.category === 'stock' ? (
                          <div className={`p-2 rounded-xl bg-red-100 text-red-500`}>
                            <Package className="w-4 h-4" />
                          </div>
                        ) : item.category === 'appointments' ? (
                          <div className={`p-2 rounded-xl bg-blue-100 text-blue-500`}>
                            <Calendar className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className={`p-2 rounded-xl bg-gray-100 text-gray-500`}>
                            <Bell className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-gray-900 leading-snug">
                            {item.title}
                          </p>
                          <button
                            onClick={() => dismiss(item.id)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-all shrink-0"
                            title="Dismiss"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed break-words">
                          {item.message}
                        </p>

                        {/* Actions & Meta */}
                        <div className="flex items-center justify-between gap-2 mt-3">
                          <span className="text-[10px] text-gray-400 tabular-nums">
                            {item.time}
                          </span>

                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 border rounded-full text-[9px] font-bold uppercase ${badgeStyle}`}>
                              {item.level}
                            </span>

                            {!item.read && (
                              <button
                                onClick={() => markRead(item.id)}
                                className="text-[10px] font-bold text-teal-600 hover:underline px-1 py-0.5"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
