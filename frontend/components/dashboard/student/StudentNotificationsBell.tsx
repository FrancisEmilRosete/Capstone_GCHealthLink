'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, FileText, Download } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { printCertificate, type PrintableCertificate } from '@/lib/printCertificate';

interface AdvisoryItem {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | string;
  targetDept: string | null;
  createdAt: string;
}

interface CertificateItem {
  id: string;
  studentId: string;
  student: string;
  course: string;
  certificateType: string;
  diagnosisFindings: string;
  recommendationsRemarks: string;
  issuedAt: string;
  issuedBy: string;
  issuedByRole?: string;
}

interface CombinedNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'advisory' | 'certificate';
  severity?: 'INFO' | 'WARNING' | 'CRITICAL' | string;
  certData?: CertificateItem;
}

interface AdvisoryResponse {
  success: boolean;
  data: AdvisoryItem[];
}

interface CertificateResponse {
  success: boolean;
  data: CertificateItem[];
}

interface StateResponse {
  success: boolean;
  data: {
    readIds: string[];
    dismissedIds: string[];
  };
}

export default function StudentNotificationsBell() {
  const [notifications, setNotifications] = useState<CombinedNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    const token = getToken();
    if (!token) return;

    try {
      const [advisoriesRes, certsRes, stateRes] = await Promise.allSettled([
        api.get<AdvisoryResponse>('/advisories', token),
        api.get<CertificateResponse>('/certificates', token),
        api.get<StateResponse>('/advisories/state', token),
      ]);

      let rawAdvisories: AdvisoryItem[] = [];
      let rawCerts: CertificateItem[] = [];
      let activeReadIds: string[] = [];
      let activeDismissedIds: string[] = [];

      if (advisoriesRes.status === 'fulfilled') {
        rawAdvisories = advisoriesRes.value.data || [];
      }
      if (certsRes.status === 'fulfilled') {
        rawCerts = certsRes.value.data || [];
      }
      if (stateRes.status === 'fulfilled') {
        activeReadIds = stateRes.value.data?.readIds || [];
        activeDismissedIds = stateRes.value.data?.dismissedIds || [];
      }

      setReadIds(activeReadIds);
      setDismissedIds(activeDismissedIds);

      const readSet = new Set(activeReadIds);
      const dismissedSet = new Set(activeDismissedIds);

      // Map advisories to combined notifications
      const mappedAdvisories: CombinedNotification[] = rawAdvisories.map((item) => ({
        id: `advisory-${item.id}`,
        title: item.title,
        message: item.message,
        time: item.createdAt,
        read: readSet.has(`advisory-${item.id}`),
        type: 'advisory',
        severity: item.severity,
      }));

      // Map certificates to combined notifications
      const mappedCerts: CombinedNotification[] = rawCerts.map((item) => {
        const certTypeLabel = item.certificateType === 'PHYSICAL_EXAMINATION' || item.certificateType === 'PHYSICAL_EXAM'
          ? 'Physical Examination'
          : 'Consultation';

        return {
          id: `certificate-${item.id}`,
          title: 'Official Medical Certificate Issued',
          message: `A clinic ${certTypeLabel} certificate has been issued for you by ${item.issuedBy}.`,
          time: item.issuedAt,
          read: readSet.has(`certificate-${item.id}`),
          type: 'certificate',
          severity: 'INFO',
          certData: item,
        };
      });

      // Combine, filter out dismissed, and sort by date descending
      const combined = [...mappedAdvisories, ...mappedCerts]
        .filter((item) => !dismissedSet.has(item.id))
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setNotifications(combined);
    } catch {
      // Quietly ignore network failures
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();

    // Poll for notifications every 60 seconds
    const interval = setInterval(() => {
      void loadNotifications();
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

  const unreadCount = notifications.filter((item) => !item.read).length;

  async function persistState(nextReadIds: string[], nextDismissedIds: string[]) {
    const token = getToken();
    if (!token) return;

    try {
      await api.put(
        '/advisories/state',
        {
          readIds: nextReadIds,
          dismissedIds: nextDismissedIds,
        },
        token,
      );
    } catch {
      // Quietly handle persistence errors
    }
  }

  function markRead(id: string) {
    setNotifications((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, read: true } : item));
      const nextReadIds = Array.from(new Set([...readIds, id]));
      setReadIds(nextReadIds);
      void persistState(nextReadIds, dismissedIds);
      return next;
    });
  }

  function markAllRead() {
    setNotifications((prev) => {
      const next = prev.map((item) => ({ ...item, read: true }));
      const nextReadIds = Array.from(new Set([...readIds, ...prev.map((item) => item.id)]));
      setReadIds(nextReadIds);
      void persistState(nextReadIds, dismissedIds);
      return next;
    });
  }

  function dismiss(id: string) {
    setNotifications((prev) => {
      const next = prev.filter((item) => item.id !== id);
      const nextDismissedIds = Array.from(new Set([...dismissedIds, id]));
      setDismissedIds(nextDismissedIds);
      void persistState(readIds, nextDismissedIds);
      return next;
    });
  }

  function handleViewCertificate(cert: CertificateItem, notificationId: string) {
    // Generate/print the certificate
    const printableCert: PrintableCertificate = {
      id: cert.id,
      studentId: cert.studentId,
      student: cert.student,
      course: cert.course,
      certificateType: cert.certificateType,
      diagnosisFindings: cert.diagnosisFindings,
      recommendationsRemarks: cert.recommendationsRemarks,
      issuedAt: cert.issuedAt,
      issuedBy: cert.issuedBy,
      issuedByRole: cert.issuedByRole,
    };
    printCertificate(printableCert);

    // Mark as read
    markRead(notificationId);
  }

  function formatDateTime(iso: string) {
    try {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return iso;
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return iso;
    }
  }

  return (
    <div ref={containerRef} className="relative z-30">
      {/* Trigger Bell Button */}
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Box */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-gray-950/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1 transition-all"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-850">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500 flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 text-gray-300 dark:text-gray-700" />
                <p>No new notifications available.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const severity = item.severity?.toUpperCase() || 'INFO';
                const isCrit = severity === 'CRITICAL';
                const isWarn = severity === 'WARNING';

                const badgeStyle = isCrit
                  ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-950/50'
                  : isWarn
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-950/50'
                    : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-950/50';

                return (
                  <div
                    key={item.id}
                    className={`p-4 transition-colors relative hover:bg-gray-50 dark:hover:bg-gray-850/40 ${
                      !item.read ? 'bg-teal-500/[0.02] dark:bg-teal-500/[0.01]' : 'opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Left Icon */}
                      <div className="mt-0.5 shrink-0">
                        {item.type === 'certificate' ? (
                          <div className="p-2 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400">
                            <FileText className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className={`p-2 rounded-xl bg-gray-100 dark:bg-gray-800 ${isCrit ? 'text-red-500' : isWarn ? 'text-amber-500' : 'text-blue-500'}`}>
                            <Bell className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-snug">
                            {item.title}
                          </p>
                          <button
                            onClick={() => dismiss(item.id)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all shrink-0"
                            title="Dismiss"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-450 mt-1 leading-relaxed break-words">
                          {item.message}
                        </p>

                        {/* Actions & Meta */}
                        <div className="flex items-center justify-between gap-2 mt-3">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                            {formatDateTime(item.time)}
                          </span>

                          <div className="flex items-center gap-2">
                            {item.type === 'certificate' && item.certData && (
                              <button
                                onClick={() => handleViewCertificate(item.certData!, item.id)}
                                className="px-2.5 py-1 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-[10px] font-bold shadow-md shadow-teal-500/10 flex items-center gap-1 transition-all"
                              >
                                <Download className="w-3 h-3" /> View / Print
                              </button>
                            )}

                            {item.type === 'advisory' && (
                              <span className={`px-1.5 py-0.5 border rounded-full text-[9px] font-bold ${badgeStyle}`}>
                                {severity}
                              </span>
                            )}

                            {!item.read && (
                              <button
                                onClick={() => markRead(item.id)}
                                className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline px-1 py-0.5"
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
