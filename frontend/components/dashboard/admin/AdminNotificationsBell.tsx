'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, ShieldAlert, Activity, Package, AlertTriangle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDateTime12Hour } from '@/lib/time';

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
    topConcerns: Array<{ tag: string; count: number }>;
    departmentHeatmap: Record<string, number>;
    outbreakWatch: string | Array<{ level: string; message: string; cases: number }>;
  };
}

function toLevel(severity: string): AdminAlert['level'] {
  const normalized = severity.toUpperCase();
  if (normalized === 'CRITICAL') return 'critical';
  if (normalized === 'WARNING') return 'warning';
  return 'info';
}

function formatTime(iso: string) {
  return formatDateTime12Hour(iso);
}

export default function AdminNotificationsBell() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function loadAlerts() {
    const token = getToken();
    if (!token) return;

    try {
      const [advisoriesResponse, inventoryResponse, analyticsResponse] = await Promise.allSettled([
        api.get<AdvisoryResponse>('/advisories', token),
        api.get<InventoryResponse>('/inventory', token),
        api.get<AnalyticsResponse>('/admin/analytics', token),
      ]);

      const advisoryAlerts: AdminAlert[] = advisoriesResponse.status === 'fulfilled' ? (advisoriesResponse.value.data || []).map((advisory) => ({
        id: `advisory-${advisory.id}`,
        level: toLevel(advisory.severity),
        category: 'activity',
        title: advisory.title,
        message: advisory.message,
        time: formatTime(advisory.createdAt),
        read: false,
      })) : [];

      const inventoryAlerts: AdminAlert[] = inventoryResponse.status === 'fulfilled' ? (inventoryResponse.value.data || [])
        .filter((item) => item.currentStock <= item.reorderThreshold)
        .map((item) => ({
          id: `inventory-${item.id}`,
          level: item.currentStock === 0 ? 'critical' : 'warning',
          category: 'inventory',
          title: `${item.itemName} ${item.currentStock === 0 ? 'Out of Stock' : 'Below Threshold'}`,
          message: `Current stock: ${item.currentStock} ${item.unit}. Reorder threshold: ${item.reorderThreshold}.`,
          time: 'Inventory signal',
          read: false,
        })) : [];

      const healthAlerts: AdminAlert[] = [];
      const systemAlerts: AdminAlert[] = [];

      if (analyticsResponse.status === 'fulfilled') {
        const analytics = analyticsResponse.value.data;
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
        } else if (Array.isArray(analytics.outbreakWatch)) {
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

        (analytics.topConcerns || []).slice(0, 4).forEach((concern, index) => {
          systemAlerts.push({
            id: `system-concern-${index}`,
            level: 'info',
            category: 'system',
            title: 'Top Concern Snapshot',
            message: `${concern.tag || 'General consultation'} has ${concern.count} recorded visits.`,
            time: 'Analytics summary',
            read: false,
          });
        });
      }

      setAlerts([...healthAlerts, ...inventoryAlerts, ...advisoryAlerts, ...systemAlerts]);
    } catch {
      // Quietly ignore network failures
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAlerts();

    // Poll for notifications every 60 seconds
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

  function markRead(id: string) {
    setAlerts((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }

  function markAllRead() {
    setAlerts((prev) => prev.map((item) => ({ ...item, read: true })));
  }

  function dismiss(id: string) {
    setAlerts((prev) => prev.filter((item) => item.id !== id));
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
                        {item.category === 'health' ? (
                          <div className={`p-2 rounded-xl bg-red-100 text-red-500`}>
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                        ) : item.category === 'inventory' ? (
                          <div className={`p-2 rounded-xl bg-amber-100 text-amber-500`}>
                            <Package className="w-4 h-4" />
                          </div>
                        ) : item.category === 'system' ? (
                          <div className={`p-2 rounded-xl bg-blue-100 text-blue-500`}>
                            <Activity className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className={`p-2 rounded-xl bg-gray-100 text-gray-500`}>
                            <AlertTriangle className="w-4 h-4" />
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
