'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface AnalyticsResponse {
  success: boolean;
  data: {
    totalVisits: number;
    topConcerns: Array<{ tag: string; count: number }>;
    departmentHeatmap: Record<string, number>;
    outbreakWatch: string | Array<{ level: string; message: string; cases: number }>;
    monthlyVisits: Array<{ month: string; count: number }>;
    weeklyVisits: Array<{ day: string; count: number }>;
    resourcePrediction: {
      busiestHour: { hour: string; count: number };
      busiestDay: { day: string; count: number };
      recentTrend: { direction: string; percentChange: number };
      expectedVisitsNext7Days: number;
      recommendedStaffing: string;
    };
  };
}

function downloadCsv(
  monthly: Array<{ month: string; count: number }>,
  weekly: Array<{ day: string; count: number }>,
  topConcerns: Array<{ tag: string; count: number }>,
  departments: Array<{ dept: string; count: number }>,
) {
  const rows: string[][] = [
    ['Section', 'Label', 'Value'],
    ...monthly.map((item) => ['Monthly Visits', item.month, String(item.count)]),
    ...weekly.map((item) => ['Weekly Visits', item.day, String(item.count)]),
    ...topConcerns.map((item) => ['Top Concerns', item.tag || 'General Consultation', String(item.count)]),
    ...departments.map((item) => ['Department Heatmap', item.dept, String(item.count)]),
  ];

  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `admin_report_${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function outbreakSummary(outbreakWatch: AnalyticsResponse['data']['outbreakWatch']) {
  if (typeof outbreakWatch === 'string') return outbreakWatch;
  if (!outbreakWatch || outbreakWatch.length === 0) return 'Green - No clusters detected';
  return outbreakWatch.map((item) => `${item.level}: ${item.message} (${item.cases})`).join(' | ');
}

function mapTopConcernTags(items: Array<{ tag: string; count: number }>) {
  return items.map((item) => ({
    tag: item.tag?.trim() || 'General Consultation',
    count: item.count,
  }));
}

function getOutbreakStatus(outbreakWatch: AnalyticsResponse['data']['outbreakWatch']) {
  if (Array.isArray(outbreakWatch)) {
    if (outbreakWatch.some((item) => item.level?.toUpperCase() === 'RED')) return 'CRITICAL';
    if (outbreakWatch.some((item) => item.level?.toUpperCase() === 'YELLOW')) return 'WARNING';
    return 'GREEN';
  }

  const text = outbreakWatch.toUpperCase();
  if (text.includes('RED') || text.includes('CRITICAL')) return 'CRITICAL';
  if (text.includes('YELLOW') || text.includes('WARNING') || text.includes('AMBER') || text.includes('ORANGE')) return 'WARNING';
  return 'GREEN';
}

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsResponse['data'] | null>(null);

  useEffect(() => {
    async function loadData() {
      const token = getToken();
      if (!token) {
        setError('You are not logged in. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const analyticsResponse = await api.get<AnalyticsResponse>('/admin/analytics', token);
        setAnalytics(analyticsResponse.data);
        setError('');
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load analytics reports.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const monthlyVisitSummary = analytics?.monthlyVisits || [];
  const weeklyVisits = analytics?.weeklyVisits || [];

  const departmentData = useMemo(() => {
    const heatmap = analytics?.departmentHeatmap || {};
    return Object.entries(heatmap)
      .map(([dept, count]) => ({ dept, count }))
      .sort((a, b) => b.count - a.count);
  }, [analytics]);

  const topConcerns = useMemo(() => {
    return mapTopConcernTags(analytics?.topConcerns || []);
  }, [analytics]);

  const outbreakText = useMemo(() => {
    if (!analytics) return 'Loading outbreak watch...';
    return outbreakSummary(analytics.outbreakWatch);
  }, [analytics]);

  const outbreakStatus = useMemo(() => {
    if (!analytics) return 'GREEN';
    return getOutbreakStatus(analytics.outbreakWatch);
  }, [analytics]);

  const outbreakBannerClass = outbreakStatus === 'CRITICAL'
    ? 'border-red-300 bg-red-100 text-red-800'
    : outbreakStatus === 'WARNING'
      ? 'border-amber-300 bg-amber-100 text-amber-800'
      : 'border-green-300 bg-green-100 text-green-800';

  async function handlePdfDownload() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      setDownloadingPdf(true);
      const { blob, fileName } = await api.getBlob('/admin/reports/monthly-pdf', token);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = fileName || `gc-healthlink-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to generate PDF report.');
      }
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live school-wide insights from backend analytics</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { void handlePdfDownload(); }}
            disabled={downloadingPdf}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-70"
          >
            {downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
          </button>
          <button
            onClick={() => downloadCsv(monthlyVisitSummary, weeklyVisits, topConcerns, departmentData)}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
          >
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-teal-600">{loading ? '...' : (analytics?.totalVisits || 0)}</p>
          <p className="text-xs font-semibold text-gray-700 mt-0.5">Total Visits</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{loading ? '...' : topConcerns.length}</p>
          <p className="text-xs font-semibold text-gray-700 mt-0.5">Top Concern Tags</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{loading ? '...' : departmentData.length}</p>
          <p className="text-xs font-semibold text-gray-700 mt-0.5">Active Departments</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{loading ? '...' : (analytics?.resourcePrediction.expectedVisitsNext7Days || 0)}</p>
          <p className="text-xs font-semibold text-gray-700 mt-0.5">Forecast (Next 7 Days)</p>
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm ${outbreakBannerClass}`}>
        <span className="font-semibold">Outbreak Watch:</span> {outbreakText}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Weekly Clinic Visits</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyVisits}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Monthly Visit Summary</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyVisitSummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Top Health Concerns</h2>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={topConcerns} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="tag" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
              <Tooltip />
              <Bar dataKey="count" fill="#14b8a6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Department Heatmap</h2>
          {departmentData.length === 0 ? (
            <p className="text-sm text-gray-400">No department data available.</p>
          ) : (
            <div className="space-y-3">
              {departmentData.map((item, index) => {
                const max = departmentData[0]?.count || 1;
                const width = Math.max(6, Math.round((item.count / max) * 100));
                return (
                  <div key={`${item.dept}-${index}`}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{item.dept}</span>
                      <span className="font-semibold text-gray-700">{item.count}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
        <h2 className="text-sm font-semibold text-gray-800">Resource Prediction</h2>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Busiest Hour:</span> {analytics?.resourcePrediction.busiestHour.hour || 'N/A'}
          {' '}
          ({analytics?.resourcePrediction.busiestHour.count || 0} visits)
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Busiest Day:</span> {analytics?.resourcePrediction.busiestDay.day || 'N/A'}
          {' '}
          ({analytics?.resourcePrediction.busiestDay.count || 0} visits)
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Recent Trend:</span> {analytics?.resourcePrediction.recentTrend.direction || 'stable'}
          {' '}
          ({analytics?.resourcePrediction.recentTrend.percentChange || 0}%)
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Suggested Staffing:</span> {analytics?.resourcePrediction.recommendedStaffing || '1 clinic staff on standby'}
        </p>
      </div>
    </div>
  );
}
