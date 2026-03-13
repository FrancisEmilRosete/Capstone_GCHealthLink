'use client';

import { useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface TopConcern {
  tag: string;
  count: number;
}

interface OutbreakAlert {
  level: string;
  message: string;
  cases: number;
}

interface AnalyticsData {
  totalVisits: number;
  topConcerns: TopConcern[];
  departmentHeatmap: Record<string, number>;
  outbreakWatch: OutbreakAlert[] | string;
}

interface AnalyticsResponse {
  success: boolean;
  message: string;
  data: AnalyticsData;
}

function mapTopConcernTags(items: TopConcern[]) {
  return items.map((item) => ({
    tag: item.tag?.trim() || 'General Consultation',
    count: item.count,
  }));
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAnalytics() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const response = await api.get<AnalyticsResponse>('/admin/analytics', token);
      setData(response.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load admin analytics.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const departmentRows = useMemo(
    () => Object.entries(data?.departmentHeatmap || {}).sort((a, b) => b[1] - a[1]),
    [data],
  );

  const topConcerns = useMemo(
    () => mapTopConcernTags(data?.topConcerns || []),
    [data?.topConcerns],
  );

  const maxDepartmentCount = Math.max(...departmentRows.map(([, count]) => count), 1);

  const topConcern = topConcerns[0]?.tag || '-';
  const outbreakCount = Array.isArray(data?.outbreakWatch) ? data?.outbreakWatch.length : 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Department Health Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Live analytics from backend records</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Clinic Visits"
          value={loading ? '...' : data?.totalVisits ?? 0}
          sub="All-time recorded visits"
          color="text-teal-600"
        />
        <StatCard
          label="Tracked Departments"
          value={loading ? '...' : departmentRows.length}
          sub="With recorded clinic activity"
          color="text-blue-600"
        />
        <StatCard
          label="Top Concern"
          value={loading ? '...' : topConcern}
          sub="Most frequent complaint"
          color="text-orange-600"
        />
        <StatCard
          label="Outbreak Alerts"
          value={loading ? '...' : outbreakCount}
          sub="Clusters flagged in last 48h"
          color="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Top Health Concerns</h2>

          {loading ? (
            <p className="text-sm text-gray-400">Loading concerns...</p>
          ) : topConcerns.length === 0 ? (
            <p className="text-sm text-gray-400">No concerns recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {topConcerns.map((concern) => (
                <div key={`${concern.tag}-${concern.count}`} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                  <p className="text-sm text-gray-700 truncate pr-3">{concern.tag}</p>
                  <span className="text-xs font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                    {concern.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Visits by Department</h2>

          {loading ? (
            <p className="text-sm text-gray-400">Loading departments...</p>
          ) : departmentRows.length === 0 ? (
            <p className="text-sm text-gray-400">No department activity yet.</p>
          ) : (
            <div className="space-y-3">
              {departmentRows.map(([department, count]) => (
                <div key={department}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">{department}</span>
                    <span className="font-semibold text-gray-800">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-teal-500"
                      style={{ width: `${Math.max(8, (count / maxDepartmentCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Outbreak Watch</h2>

        {loading ? (
          <p className="text-sm text-gray-400">Checking alerts...</p>
        ) : Array.isArray(data?.outbreakWatch) && data.outbreakWatch.length > 0 ? (
          <div className="space-y-2">
            {data.outbreakWatch.map((alert, index) => (
              <div key={`${alert.message}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-700">{alert.level} Alert</p>
                <p className="text-sm text-amber-800 mt-0.5">{alert.message}</p>
                <p className="text-xs text-amber-700 mt-1">Cases: {alert.cases}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            {typeof data?.outbreakWatch === 'string' ? data.outbreakWatch : 'Green - No clusters detected'}
          </p>
        )}
      </div>
    </div>
  );
}
