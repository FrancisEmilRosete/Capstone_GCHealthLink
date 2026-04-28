'use client';

import OutbreakForecastChart, { type OutbreakForecastPoint } from './OutbreakForecastChart';
import PredictiveHeatMap, { type HeatMapPoint } from './PredictiveHeatMap';

interface AdminPredictiveAnalyticsSectionProps {
  heatMapData: HeatMapPoint[];
  forecastData: OutbreakForecastPoint[];
  heatMapTitle?: string;
  forecastTitle?: string;
}

export default function AdminPredictiveAnalyticsSection({
  heatMapData,
  forecastData,
  heatMapTitle,
  forecastTitle,
}: AdminPredictiveAnalyticsSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Predictive Analytics</h2>
        <p className="text-sm text-gray-500">Campus-wide health forecasting and outbreak risk monitoring</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <PredictiveHeatMap
          title={heatMapTitle}
          data={heatMapData}
        />
        <OutbreakForecastChart
          title={forecastTitle}
          data={forecastData}
        />
      </div>
    </section>
  );
}
