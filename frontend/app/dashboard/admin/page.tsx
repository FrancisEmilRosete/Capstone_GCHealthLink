'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Activity, Users, AlertTriangle, TrendingUp } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { DEPARTMENT_COURSE_MAP, normalizeDepartmentCode } from '@/constants/departments';
import AdminPredictiveAnalyticsSection from '@/components/dashboard/admin/AdminPredictiveAnalyticsSection';
import type { HeatMapPoint } from '@/components/dashboard/admin/PredictiveHeatMap';
import type { OutbreakForecastPoint } from '@/components/dashboard/admin/OutbreakForecastChart';
import ResourcePredictionPanel, { type ProjectedSupplyRisk } from '@/components/dashboard/admin/ResourcePredictionPanel';
import WellnessTrendsWidget from '@/components/dashboard/admin/WellnessTrendsWidget';
import AiOutbreakForecastClient from '@/components/dashboard/admin/AiOutbreakForecastClient';
import HealthConcernsByDepartmentCard from '@/components/dashboard/shared/HealthConcernsByDepartmentCard';

// New UI Components
import { StatCard } from '@/components/ui/StatCard';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

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
  monthlyVisits?: Array<{ month: string; count: number }>;
  weeklyVisits?: Array<{ day: string; count: number }>;
  resourcePrediction?: {
    busiestHour?: { hour: string; count: number };
    busiestDay?: { day: string; count: number };
    recentTrend?: { direction: string; percentChange: number };
    expectedVisitsNext7Days?: number;
    recommendedStaffing?: string;
    projectedStockouts?: Array<{
      id?: string;
      itemName: string;
      currentStock: number;
      projectedDaysRemaining: number;
      projectedDailyUsage?: number;
      suggestedRestockQty?: number;
      status?: 'critical' | 'warning';
    }>;
  };
  inventorySummary?: {
    expired: number;
    expiringSoon: number;
    nearReorder: number;
    outOfStock: number;
  };
}

interface AnalyticsResponse {
  success: boolean;
  message: string;
  data: AnalyticsData;
}

function downloadAdminAnalyticsCsv(
  monthly: Array<{ month: string; count: number }>,
  weekly: Array<{ day: string; count: number }>,
  concerns: Array<{ tag: string; count: number }>,
  departments: Array<[string, number]>,
) {
  const rows: string[][] = [
    ['Section', 'Label', 'Value'],
    ...monthly.map((item) => ['Monthly Visits', item.month, String(item.count)]),
    ...weekly.map((item) => ['Weekly Visits', item.day, String(item.count)]),
    ...concerns.map((item) => ['Top Concerns', item.tag || 'General Consultation', String(item.count)]),
    ...departments.map(([department, count]) => ['Department Heatmap', department, String(count)]),
  ];

  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = `admin_dashboard_export_${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function mapTopConcernTags(items: TopConcern[]) {
  return items.map((item) => ({
    tag: toDisplayConcernTag(item.tag),
    count: item.count,
  }));
}

const DEPARTMENT_NAME_BY_CODE = DEPARTMENT_COURSE_MAP.reduce<Record<string, string>>((accumulator, entry) => {
  accumulator[entry.code] = entry.name;
  return accumulator;
}, {});

function toDisplayConcernTag(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'General Consultation';
  }

  const normalized = value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toDisplayDepartment(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Unspecified Department';
  }

  const cleaned = value.trim();
  const code = normalizeDepartmentCode(cleaned);
  return DEPARTMENT_NAME_BY_CODE[code] || cleaned;
}

function riskLevelFromScore(score: number): HeatMapPoint['riskLevel'] {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function riskAction(level: HeatMapPoint['riskLevel'], concern: string) {
  if (level === 'High') {
    return `Activate outbreak watch protocol for ${concern} and assign standby staff.`;
  }

  if (level === 'Medium') {
    return `Issue prevention advisory for ${concern} and monitor attendance trends.`;
  }

  return `Continue routine monitoring and weekly reminders for ${concern}.`;
}

function mapDepartmentHeatMapToOperationalRows(
  departmentHeatmap: Record<string, number>,
  topConcerns: TopConcern[],
): HeatMapPoint[] {
  const entries = Object.entries(departmentHeatmap);
  if (entries.length === 0) {
    return [];
  }

  const maxCount = Math.max(...entries.map(([, count]) => count), 1);
  const primaryConcern = toDisplayConcernTag(topConcerns[0]?.tag);

  return entries
    .map(([department, count]) => {
      const riskScore = Math.max(5, Math.round((count / maxCount) * 100));
      const riskLevel = riskLevelFromScore(riskScore);

      return {
        id: `${department}-${count}`,
        department: toDisplayDepartment(department),
        activeCases: count,
        riskScore,
        riskLevel,
        recommendedAction: riskAction(riskLevel, primaryConcern),
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

function mapMonthlyVisitsToForecast(monthlyVisits: Array<{ month: string; count: number }>): OutbreakForecastPoint[] {
  if (monthlyVisits.length === 0) {
    return [];
  }

  return monthlyVisits.map((entry, index) => {
    const previous = index > 0 ? monthlyVisits[index - 1].count : entry.count;
    const next = Math.round((entry.count * 0.6) + (previous * 0.4));
    const confidenceSpread = Math.max(1, Math.round(next * 0.2));

    return {
      period: entry.month,
      observedCases: entry.count,
      predictedCases: next,
      lowerBound: Math.max(0, next - confidenceSpread),
      upperBound: next + confidenceSpread,
      staffingRecommendation: next >= 35 ? '4 clinic staff per shift' : next >= 20 ? '3 clinic staff per shift' : '2 clinic staff per shift',
      actionNote: next >= 35
        ? 'Prepare extra triage desk and emergency medication packs.'
        : next >= 20
          ? 'Keep overflow consultation slots open during peak hours.'
          : 'Maintain standard staffing and continue prevention reminders.',
    };
  });
}

function mapProjectedStockouts(items: NonNullable<AnalyticsData['resourcePrediction']>['projectedStockouts']): ProjectedSupplyRisk[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item, index) => ({
    id: item.id || `${item.itemName}-${index}`,
    itemName: item.itemName,
    currentStock: item.currentStock,
    projectedDaysRemaining: item.projectedDaysRemaining,
    projectedDailyUsage: item.projectedDailyUsage,
    suggestedRestockQty: item.suggestedRestockQty,
    status: item.status,
  }));
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

  const predictiveHeatMapData = useMemo(
    () => {
      const rows = mapDepartmentHeatMapToOperationalRows(data?.departmentHeatmap || {}, data?.topConcerns || []);
      return rows;
    },
    [data?.departmentHeatmap, data?.topConcerns],
  );

  const outbreakForecastData = useMemo(
    () => {
      const rows = mapMonthlyVisitsToForecast(data?.monthlyVisits || []);
      return rows;
    },
    [data?.monthlyVisits],
  );

  const wellnessMonthlyData = useMemo(
    () => (data?.monthlyVisits || []).map((row) => ({ label: row.month, visits: row.count })),
    [data?.monthlyVisits],
  );

  const wellnessWeeklyData = useMemo(
    () => (data?.weeklyVisits || []).map((row) => ({ label: row.day, visits: row.count })),
    [data?.weeklyVisits],
  );

  const projectedSupplyRisks = useMemo(
    () => mapProjectedStockouts(data?.resourcePrediction?.projectedStockouts),
    [data?.resourcePrediction?.projectedStockouts],
  );

  const inventorySummary = data?.inventorySummary;

  const topConcern = topConcerns[0]?.tag || '-';
  const outbreakCount = Array.isArray(data?.outbreakWatch) ? data?.outbreakWatch.length : 0;
  
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Department Health Overview"
        subtitle="Live analytics from backend records"
        action={
          <Button
            onClick={() => downloadAdminAnalyticsCsv(data?.monthlyVisits || [], data?.weeklyVisits || [], topConcerns, departmentRows)}
            disabled={loading}
            size="md"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {loading ? 'Preparing...' : 'Export CSV'}
          </Button>
        }
      />

      {error && (
        <ErrorAlert
          message={error}
          variant="error"
          onRetry={() => void loadAnalytics()}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Clinic Visits"
          value={loading ? '...' : data?.totalVisits ?? 0}
          icon={<Activity className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          label="Tracked Departments"
          value={loading ? '...' : departmentRows.length}
          icon={<Users className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          label="Top Concern"
          value={loading ? '...' : topConcern}
          icon={<TrendingUp className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          label="Outbreak Alerts"
          value={loading ? '...' : outbreakCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      {inventorySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Expired Items" value={loading ? '...' : inventorySummary.expired} icon={<AlertTriangle className="h-5 w-5" />} loading={loading} />
          <StatCard label="Expiring Soon" value={loading ? '...' : inventorySummary.expiringSoon} icon={<TrendingUp className="h-5 w-5" />} loading={loading} />
          <StatCard label="Near Reorder" value={loading ? '...' : inventorySummary.nearReorder} icon={<Users className="h-5 w-5" />} loading={loading} />
          <StatCard label="Out of Stock" value={loading ? '...' : inventorySummary.outOfStock} icon={<Activity className="h-5 w-5" />} loading={loading} />
        </div>
      )}

      {inventorySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Expired Items" value={inventorySummary.expired} icon={<AlertTriangle className="h-5 w-5" />} loading={loading} />
          <StatCard label="Expiring Soon" value={inventorySummary.expiringSoon} icon={<TrendingUp className="h-5 w-5" />} loading={loading} />
          <StatCard label="Near Reorder" value={inventorySummary.nearReorder} icon={<Users className="h-5 w-5" />} loading={loading} />
          <StatCard label="Out of Stock" value={inventorySummary.outOfStock} icon={<Activity className="h-5 w-5" />} loading={loading} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-h3 text-[hsl(var(--foreground))] mb-4">Top Health Concerns</h2>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-12"></div>
              ))}
            </div>
          ) : topConcerns.length === 0 ? (
            <EmptyState
              icon="search"
              title="No concerns recorded yet"
              description="Health concern data will appear here once clinic visits are logged"
            />
          ) : (
            <div className="space-y-2">
              {topConcerns.map((concern) => (
                <div
                  key={`${concern.tag}-${concern.count}`}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2.5 hover:border-[hsl(var(--border-hover))] transition-colors"
                >
                  <p className="text-sm text-[hsl(var(--foreground))] truncate pr-3 font-medium">
                    {concern.tag}
                  </p>
                  <Badge variant="info">{concern.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-h3 text-[hsl(var(--foreground))] mb-4">Visits by Department</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="skeleton h-4 w-full"></div>
                  <div className="skeleton h-2 w-full"></div>
                </div>
              ))}
            </div>
          ) : departmentRows.length === 0 ? (
            <EmptyState
              icon="users"
              title="No department activity yet"
              description="Department visit statistics will appear here once students check in"
            />
          ) : (
            <div className="space-y-3">
              {departmentRows.map(([department, count]) => (
                <div key={department}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[hsl(var(--muted))] font-medium">{toDisplayDepartment(department)}</span>
                    <span className="font-semibold text-[hsl(var(--foreground))] tabular-nums">{count}</span>
                  </div>
                  <div className="h-2 rounded-[var(--radius-full)] bg-[hsl(var(--border))] overflow-hidden">
                    <div
                      className="h-full bg-[hsl(var(--primary))] transition-all"
                      style={{ width: `${Math.max(8, (count / maxDepartmentCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AdminPredictiveAnalyticsSection
        heatMapData={predictiveHeatMapData}
        forecastData={outbreakForecastData}
        heatMapTitle="Campus Risk Heat Map"
        forecastTitle="Seasonal Outbreak Projection"
      />

      <AiOutbreakForecastClient />

      <WellnessTrendsWidget
        totalVisits={data?.totalVisits ?? 0}
        monthly={wellnessMonthlyData}
        weekly={wellnessWeeklyData}
        concerns={topConcerns}
      />

      <ResourcePredictionPanel
        items={projectedSupplyRisks}
      />

      <div className="card">
        <h2 className="text-h3 text-[hsl(var(--foreground))] mb-4">Outbreak Watch</h2>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-20"></div>
            ))}
          </div>
        ) : Array.isArray(data?.outbreakWatch) && data.outbreakWatch.length > 0 ? (
          <div className="space-y-2">
            {data.outbreakWatch.map((alert, index) => (
              <div
                key={`${alert.message}-${index}`}
                className="rounded-[var(--radius-lg)] border border-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))] px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[hsl(var(--warning))]">{alert.level} Alert</p>
                    <p className="text-sm text-[hsl(var(--foreground))] mt-0.5">{alert.message}</p>
                    <p className="text-xs text-[hsl(var(--muted))] mt-1 tabular-nums">Cases: {alert.cases}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--success))] bg-[hsl(var(--success-soft))] px-4 py-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--success))]"></div>
            <p className="text-sm font-medium text-[hsl(var(--success))]">
              {typeof data?.outbreakWatch === 'string' ? data.outbreakWatch : 'All clear - No clusters detected'}
            </p>
          </div>
        )}
      </div>

      <HealthConcernsByDepartmentCard />
    </div>
  );
}
