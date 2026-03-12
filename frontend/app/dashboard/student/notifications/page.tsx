'use client';

import { useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

type SeverityFilter = 'ALL' | 'INFO' | 'WARNING' | 'CRITICAL';

interface AdvisoryItem {
  id: string;
  title: string;
  message: string;
  targetDept: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | string;
  createdAt: string;
}

interface AdvisoryResponse {
  success: boolean;
  message?: string;
  data: AdvisoryItem[];
}

const FILTERS: Array<{ id: SeverityFilter; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'INFO', label: 'Info' },
  { id: 'WARNING', label: 'Warning' },
  { id: 'CRITICAL', label: 'Critical' },
];

function normalizeSeverity(value: string): 'INFO' | 'WARNING' | 'CRITICAL' {
  const normalized = value.toUpperCase();
  if (normalized === 'CRITICAL') return 'CRITICAL';
  if (normalized === 'WARNING') return 'WARNING';
  return 'INFO';
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function StudentNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<SeverityFilter>('ALL');
  const [advisories, setAdvisories] = useState<AdvisoryItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');

  async function loadAdvisories(isRefresh = false) {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      const response = await api.get<AdvisoryResponse>('/advisories', token);
      setAdvisories(response.data || []);
      setError('');
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load advisories.');
      }
    } finally {
      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    void loadAdvisories();
  }, []);

  const counts = useMemo(() => {
    const summary = {
      ALL: advisories.length,
      INFO: 0,
      WARNING: 0,
      CRITICAL: 0,
    };

    for (const advisory of advisories) {
      const severity = normalizeSeverity(advisory.severity || 'INFO');
      summary[severity] += 1;
    }

    return summary;
  }, [advisories]);

  const filtered = useMemo(() => {
    if (activeFilter === 'ALL') return advisories;
    return advisories.filter((item) => normalizeSeverity(item.severity || 'INFO') === activeFilter);
  }, [activeFilter, advisories]);

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Health Advisories</h1>
          <p className="text-sm text-gray-500 mt-1">Timely clinic announcements for your department and campus-wide alerts.</p>
        </div>

        <button
          onClick={() => { void loadAdvisories(true); }}
          disabled={refreshing || loading}
          className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-70"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Total Advisories</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{loading ? '...' : counts.ALL}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Info</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{loading ? '...' : counts.INFO}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Warning</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{loading ? '...' : counts.WARNING}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Critical</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{loading ? '...' : counts.CRITICAL}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === filter.id
                ? 'bg-teal-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-800">Latest Advisories</h2>
          {lastUpdated && <p className="text-xs text-gray-400">Updated {lastUpdated}</p>}
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading advisories...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No advisories match this filter.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((advisory) => {
              const severity = normalizeSeverity(advisory.severity || 'INFO');
              const severityStyle = severity === 'CRITICAL'
                ? 'bg-red-100 text-red-700'
                : severity === 'WARNING'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700';
              const targetDept = (advisory.targetDept || 'ALL').toUpperCase();

              return (
                <article key={advisory.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{advisory.title}</p>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{advisory.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDateTime(advisory.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${severityStyle}`}>
                        {severity}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                        {targetDept === 'ALL' ? 'All Departments' : targetDept}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
