'use client';

import { useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import OutbreakForecastChart, { type OutbreakForecastPoint } from '@/components/dashboard/admin/OutbreakForecastChart';

interface AiForecastCategoryRow {
  illness_category: string;
  predicted_cases: number;
}

interface AiForecastRow {
  month: string;
  total_predicted_cases: number;
  categories: AiForecastCategoryRow[];
}

interface OutbreakForecastServicePayload {
  forecast: AiForecastRow[];
  model?: string;
  generated_at?: string;
}

interface OutbreakForecastApiResponse {
  success: boolean;
  message: string;
  data: OutbreakForecastServicePayload;
}

function formatPeriod(monthKey: string) {
  const parsed = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return monthKey;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

function mapAiForecastToChartData(rows: AiForecastRow[]): OutbreakForecastPoint[] {
  return rows
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => {
      const predicted = row.total_predicted_cases;

      return {
        period: formatPeriod(row.month),
        predictedCases: predicted,
        staffingRecommendation: predicted >= 35
          ? '4 clinic staff per shift'
          : predicted >= 20
            ? '3 clinic staff per shift'
            : '2 clinic staff per shift',
        actionNote: predicted >= 35
          ? 'Prepare outbreak response supplies for high-volume week.'
          : predicted >= 20
            ? 'Coordinate class advisories and monitor nurse queue.'
            : 'Continue routine monitoring and wellness announcements.',
        categories: row.categories ? row.categories.map(c => ({
          name: c.illness_category,
          cases: c.predicted_cases
        })) : []
      };
    });
}

export default function AiOutbreakForecastClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forecastRows, setForecastRows] = useState<AiForecastRow[]>([]);
  const [modelName, setModelName] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    async function fetchForecast() {
      const token = getToken();
      if (!token) {
        setError('You are not logged in. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        setError('');
        const response = await api.get<OutbreakForecastApiResponse>('/ai/outbreak-forecast', token);
        const payload = response.data || { forecast: [] };

        setForecastRows(Array.isArray(payload.forecast) ? payload.forecast : []);
        setModelName(payload.model || 'N/A');
        setGeneratedAt(payload.generated_at || '');
      } catch (err) {
        let isServiceUnavailable = false;
        if (err instanceof ApiError) {
          setError(err.message);
          isServiceUnavailable = err.status === 502 || err.status === 503;
        } else {
          setError('Failed to load AI outbreak forecast.');
        }

        // Graceful retry mechanism
        if (isServiceUnavailable) {
          timeoutId = setTimeout(fetchForecast, 5000);
        }
      } finally {
        setLoading(false);
      }
    }

    void fetchForecast();
    return () => clearTimeout(timeoutId);
  }, []);

  const chartData = useMemo(() => mapAiForecastToChartData(forecastRows), [forecastRows]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">AI Outbreak Forecast (Microservice)</h2>
          <p className="text-sm text-gray-500">Forecast pulled from Express bridge to FastAPI.</p>
        </div>

        {!loading && !error && (
          <div className="text-xs text-gray-500">
            <p>Model: <span className="font-medium text-gray-700">{modelName}</span></p>
            {generatedAt && <p>Generated: {new Date(generatedAt).toLocaleString('en-US')}</p>}
          </div>
        )}
      </div>

      {error && error.includes('502') || error.includes('503') || error.includes('unavailable') ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center gap-2 font-bold text-amber-700 text-sm">
            <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            AI Service Temporarily Unavailable
          </div>
          <p className="text-amber-600 text-xs text-center max-w-sm">
            Attempting to re-establish connection to the forecasting microservice. Please wait or ensure the backend AI server is running...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center text-sm text-gray-400 shadow-sm">
          Loading AI outbreak forecast...
        </div>
      ) : (
        <OutbreakForecastChart
          title="AI Outbreak Forecast"
          subtitle="Next months projected total case volume"
          data={chartData}
        />
      )}
    </section>
  );
}
