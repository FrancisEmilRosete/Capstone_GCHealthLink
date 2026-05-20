'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Download, Sparkles, BarChart2, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface NurseReportsResponse {
  success: boolean;
  data: {
    totalVisits30Days: number;
    totalMedicinesDispensed: number;
    inventoryForecast: Array<{
      itemName: string;
      currentStock: number;
      unit: string;
      dailyUsage: number;
      daysUntilDepletion: number;
    }>;
    quarterlyVisits: Array<{ quarter: string, visits: number }>;
    topHealthConcernsPerDept: Array<{ department: string, concerns: Array<{ tag: string, count: number }> }>;
    aiInsights: string[];
  };
}

export default function NurseReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState<NurseReportsResponse['data'] | null>(null);

  const getDeptColor = (deptName: string) => {
    const name = (deptName || '').toUpperCase();
    if (name.includes('CCS')) return 'bg-orange-500';
    if (name.includes('CEAS')) return 'bg-blue-500';
    if (name.includes('CBA')) return 'bg-yellow-400';
    if (name.includes('CAHS')) return 'bg-red-500';
    if (name.includes('CHTM')) return 'bg-pink-500';
    return 'bg-rose-400'; // Default
  };

  useEffect(() => {
    async function fetchReports() {
      const token = getToken();
      if (!token) {
        setError('Not authenticated.');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get<NurseReportsResponse>('/clinic/reports', token);
        setReportData(response.data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to fetch reports.');
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  function handleExportCsv() {
    if (!reportData) return;
    
    const headers = ['Medicine', 'Current Stock', 'Run Rate / Day', 'Days Until Depletion'];
    const lines = reportData.inventoryForecast.map((item) => [
      item.itemName,
      `${item.currentStock} ${item.unit}`,
      `${item.dailyUsage.toFixed(1)} ${item.unit}`,
      item.daysUntilDepletion > 365 ? 'Ample Stock' : String(item.daysUntilDepletion),
    ].map(value => `"${value}"`).join(','));

    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `clinic_report_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    alert("PDF generation using browser printing for MVP. Please press Ctrl+P or Cmd+P.");
    window.print();
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto print:p-0 print:m-0 print:block">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinic Analytics & AI Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Comprehensive clinic data, forecasting, and departmental trends</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 border border-gray-200 hover:border-teal-300 hover:text-teal-600 bg-white text-gray-600 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            Export PDF
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold text-gray-900">GC HealthLink Clinic Report</h1>
        <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 print:hidden">
          {error}
        </div>
      )}

      {/* AI Insights Panel */}
      {reportData?.aiInsights && reportData.aiInsights.length > 0 && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 text-teal-800 font-bold">
            <Sparkles className="w-5 h-5 text-teal-600" />
            AI Predictive Insights
          </div>
          <ul className="space-y-2">
            {reportData.aiInsights.map((insight, idx) => (
              <li key={idx} className="text-sm text-teal-900 flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center col-span-1 sm:col-span-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Visits (Last 30 Days)</p>
          <p className="text-4xl font-bold text-blue-600">{loading ? '...' : (reportData?.totalVisits30Days || 0)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center col-span-1 sm:col-span-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Medicines Dispensed (30 Days)</p>
          <p className="text-4xl font-bold text-teal-600">{loading ? '...' : (reportData?.totalMedicinesDispensed || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quarterly Visits */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="text-blue-500 w-5 h-5" />
            <h2 className="text-lg font-bold text-gray-800">Quarterly Breakdown</h2>
          </div>
          
          <div className="flex-1 min-h-[250px] w-full mt-2">
            {reportData?.quarterlyVisits ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.quarterlyVisits} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="visits" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading chart...</div>
            )}
          </div>
        </div>

        {/* Top Health Concerns per Dept */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-rose-500 w-5 h-5" />
            <h2 className="text-lg font-bold text-gray-800">Top Health Concerns per Department</h2>
          </div>
          <div className="space-y-6 max-h-[300px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {reportData?.topHealthConcernsPerDept?.length === 0 && (
              <p className="text-sm text-gray-400 py-10 text-center">No departmental data available yet.</p>
            )}
            {reportData?.topHealthConcernsPerDept?.map((dept, idx) => {
              const maxCount = Math.max(...dept.concerns.map(c => c.count), 1);
              const deptName = dept.department && dept.department.trim() !== "" ? dept.department : "General / Uncategorized";
              return (
                <div key={idx} className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">{deptName}</h3>
                  <div className="space-y-3">
                    {dept.concerns.map((c, i) => {
                      const percentage = (c.count / maxCount) * 100;
                      const barColorClass = getDeptColor(deptName);
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 font-medium">{c.tag}</span>
                            <span className="text-gray-900 font-bold">{c.count}</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${barColorClass} rounded-full transition-all duration-1000 ease-out`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inventory Forecast */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Predictive Inventory Forecast</h2>
          <p className="text-sm text-gray-500">Calculated based on current stock and daily usage rates.</p>
        </div>

        {reportData?.inventoryForecast && reportData.inventoryForecast.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-gray-100 text-gray-600">
                  <th className="pb-3 font-semibold">Medicine</th>
                  <th className="pb-3 font-semibold text-right">Current Stock</th>
                  <th className="pb-3 font-semibold text-right">Daily Usage</th>
                  <th className="pb-3 font-semibold">Run Out Prediction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.inventoryForecast.map((item, i) => {
                  let predictionClass = "text-teal-600 font-medium";
                  if (item.daysUntilDepletion <= 14) predictionClass = "text-red-600 font-bold bg-red-50 px-2 py-1 rounded-md inline-block";
                  else if (item.daysUntilDepletion <= 30) predictionClass = "text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded-md inline-block";

                  return (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="py-3 font-medium text-gray-900">{item.itemName}</td>
                      <td className="py-3 text-right text-gray-600">{item.currentStock} {item.unit}</td>
                      <td className="py-3 text-right text-gray-600">{item.dailyUsage.toFixed(1)} {item.unit}/day</td>
                      <td className="py-3 pl-4">
                        {item.daysUntilDepletion > 365 ? (
                          <span className="text-gray-400">Ample Stock</span>
                        ) : (
                          <span className={predictionClass}>
                            {item.daysUntilDepletion} Days
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4">No inventory forecasting data available yet.</p>
        )}
      </div>
    </div>
  );
}
