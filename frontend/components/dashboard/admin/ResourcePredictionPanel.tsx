'use client';

import { useMemo, useState } from 'react';

export interface ProjectedSupplyRisk {
  id: string;
  itemName: string;
  currentStock: number;
  projectedDaysRemaining: number;
  projectedDailyUsage?: number;
  suggestedRestockQty?: number;
  status?: 'critical' | 'warning';
}

interface ResourcePredictionPanelProps {
  title?: string;
  subtitle?: string;
  items: ProjectedSupplyRisk[];
  className?: string;
}

function deriveStatus(item: ProjectedSupplyRisk): 'critical' | 'warning' {
  if (item.status) {
    return item.status;
  }

  return item.projectedDaysRemaining <= 7 ? 'critical' : 'warning';
}

export default function ResourcePredictionPanel({
  title = 'Resource Prediction',
  subtitle = 'Medical supplies projected to run out soon',
  items,
  className,
}: ResourcePredictionPanelProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning'>('all');

  const normalizedRows = useMemo(
    () => items.map((item) => ({ ...item, resolvedStatus: deriveStatus(item) })),
    [items],
  );

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') {
      return normalizedRows;
    }

    return normalizedRows.filter((item) => item.resolvedStatus === statusFilter);
  }, [normalizedRows, statusFilter]);

  const criticalCount = normalizedRows.filter((item) => item.resolvedStatus === 'critical').length;

  return (
    <section className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className ?? ''}`.trim()}>
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>

        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          {(['all', 'critical', 'warning'] as const).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setStatusFilter(filterKey)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                statusFilter === filterKey
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-white hover:text-teal-700'
              }`}
            >
              {filterKey}
            </button>
          ))}
        </div>
      </header>

      {criticalCount > 0 && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {criticalCount} supply {criticalCount === 1 ? 'item is' : 'items are'} in critical range (7 days or less).
        </div>
      )}

      {filteredRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
          No projected stockout items in the selected filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 font-semibold">Item</th>
                <th className="px-3 py-2 font-semibold">Stock</th>
                <th className="px-3 py-2 font-semibold">Days Left</th>
                <th className="px-3 py-2 font-semibold">Daily Usage</th>
                <th className="px-3 py-2 font-semibold">Restock</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-3 py-3 font-medium text-gray-800">{item.itemName}</td>
                  <td className="px-3 py-3 text-gray-700">{item.currentStock}</td>
                  <td className="px-3 py-3 text-gray-700">{item.projectedDaysRemaining}</td>
                  <td className="px-3 py-3 text-gray-700">{item.projectedDailyUsage ?? '-'}</td>
                  <td className="px-3 py-3 text-gray-700">{item.suggestedRestockQty ?? '-'}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.resolvedStatus === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.resolvedStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
