'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface QueueItem {
  id: string;
  preferredDate: string;
  preferredTime: string;
  symptoms: string;
  status: string;
  studentProfile: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    courseDept: string;
    medicalHistory: {
      asthmaEnc?: string | null;
      diabetesEnc?: string | null;
      allergyEnc?: string | null;
    } | null;
  };
}

interface QueueResponse {
  success: boolean;
  data: QueueItem[];
}

interface InventoryResponse {
  success: boolean;
  data: Array<{
    id: string;
    currentStock: number;
    reorderThreshold: number;
  }>;
}

interface VisitsResponse {
  success: boolean;
  data: Array<{
    id: string;
    visitDate?: string | null;
    createdAt?: string | null;
  }>;
}

function isSameLocalDay(date: Date, reference: Date) {
  return (
    date.getFullYear() === reference.getFullYear()
    && date.getMonth() === reference.getMonth()
    && date.getDate() === reference.getDate()
  );
}

function resolveVisitTimestamp(visit: { createdAt?: string | null; visitDate?: string | null }) {
  const raw = visit.createdAt || visit.visitDate;
  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function hasRiskFlag(value?: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== 'none' && normalized !== 'no' && normalized !== 'n/a' && normalized !== 'na';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function EmptyQueueState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 rounded-full bg-gray-100 p-3 text-gray-400">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M5 12h14M5 17h10" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-500">No patients currently waiting.</p>
    </div>
  );
}

export default function StaffCommandCenterPage() {
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const [todayVisits, setTodayVisits] = useState(0);
  const [lowStockAlerts, setLowStockAlerts] = useState(0);

  async function loadData() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const [queueResponse, inventoryResponse, visitsResponse] = await Promise.all([
        api.get<QueueResponse>('/appointments/queue', token),
        api.get<InventoryResponse>('/inventory', token),
        api.get<VisitsResponse>('/clinic/visits', token),
      ]);

      const now = new Date();
      const visitsToday = (visitsResponse.data || []).filter((visit) => {
        const visitTimestamp = resolveVisitTimestamp(visit);
        if (!visitTimestamp) return false;
        return isSameLocalDay(visitTimestamp, now);
      }).length;

      const stockAlerts = (inventoryResponse.data || []).filter((item) => item.currentStock <= item.reorderThreshold).length;

      setQueue(queueResponse.data || []);
      setTodayVisits(visitsToday);
      setLowStockAlerts(stockAlerts);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load command center data.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function updateStatus(appointmentId: string, status: 'IN_PROGRESS' | 'COMPLETED') {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      setUpdatingId(appointmentId);
      setError('');
      await api.put(`/appointments/queue/${appointmentId}`, { status }, token);
      await loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update appointment status.');
      }
    } finally {
      setUpdatingId('');
    }
  }

  const flaggedCount = useMemo(() => {
    return queue.filter((entry) => {
      const history = entry.studentProfile.medicalHistory;
      return hasRiskFlag(history?.asthmaEnc) || hasRiskFlag(history?.diabetesEnc);
    }).length;
  }, [queue]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clinic Command Center</h1>
          <p className="text-sm text-gray-500 mt-1">Live queue, risk flags, and clinic operations snapshot.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/staff/scanner" className="px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold">
            QR Check-in
          </Link>
          <Link href="/dashboard/staff/inventory" className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 text-xs font-semibold">
            Inventory
          </Link>
          <Link href="/dashboard/staff/consultations" className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 text-xs font-semibold">
            Encounter Log
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Waiting Patients</p>
          <p className="text-2xl font-bold text-teal-600 mt-1">{loading ? '...' : queue.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Flagged Risks</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{loading ? '...' : flaggedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Today Visits</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{loading ? '...' : todayVisits}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{loading ? '...' : lowStockAlerts}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Live Patient Queue</h2>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-gray-400 text-sm">Loading queue...</div>
        ) : queue.length === 0 ? (
          <EmptyQueueState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Preferred Slot</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">Risk Flag</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {queue.map((entry) => {
                  const history = entry.studentProfile.medicalHistory;
                  const hasRisk = hasRiskFlag(history?.asthmaEnc) || hasRiskFlag(history?.diabetesEnc);

                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-left">
                        <p className="font-semibold text-gray-800">
                          {entry.studentProfile.lastName}, {entry.studentProfile.firstName}
                        </p>
                        <p className="text-xs text-teal-600 font-semibold mt-0.5">{entry.studentProfile.studentNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-left text-gray-600">{entry.studentProfile.courseDept}</td>
                      <td className="px-4 py-3 text-left text-gray-600">
                        {formatDate(entry.preferredDate)} at {entry.preferredTime}
                      </td>
                      <td className="px-4 py-3 text-left text-gray-700 max-w-[260px] truncate">{entry.symptoms}</td>
                      <td className="px-4 py-3 text-left">
                        {hasRisk ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            Priority Monitor
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/dashboard/staff/record/${encodeURIComponent(entry.studentProfile.studentNumber)}`}
                            className="text-xs font-semibold border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg hover:border-teal-300 hover:text-teal-600"
                          >
                            Open Record
                          </Link>
                          <button
                            disabled={updatingId === entry.id}
                            onClick={() => { void updateStatus(entry.id, 'IN_PROGRESS'); }}
                            className="text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1.5 rounded-lg disabled:opacity-70"
                          >
                            In Progress
                          </button>
                          <button
                            disabled={updatingId === entry.id}
                            onClick={() => { void updateStatus(entry.id, 'COMPLETED'); }}
                            className="text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white px-2.5 py-1.5 rounded-lg disabled:opacity-70"
                          >
                            Complete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
