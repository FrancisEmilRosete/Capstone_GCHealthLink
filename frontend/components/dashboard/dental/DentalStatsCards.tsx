'use client';

interface DentalStatsCardsProps {
  loading: boolean;
  waiting: number;
  inProgress: number;
  completed: number;
  urgent: number;
}

export default function DentalStatsCards({
  loading,
  waiting,
  inProgress,
  completed,
  urgent,
}: DentalStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 shadow-sm p-4">
        <p className="text-xs text-blue-700 font-semibold uppercase">⏳ Waiting</p>
        <p className="text-3xl font-bold text-blue-600 mt-2">{loading ? '-' : waiting}</p>
      </div>

      <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl border border-teal-200 shadow-sm p-4">
        <p className="text-xs text-teal-700 font-semibold uppercase">⚙️ In Progress</p>
        <p className="text-3xl font-bold text-teal-600 mt-2">{loading ? '-' : inProgress}</p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200 shadow-sm p-4">
        <p className="text-xs text-green-700 font-semibold uppercase">✓ Completed</p>
        <p className="text-3xl font-bold text-green-600 mt-2">{loading ? '-' : completed}</p>
      </div>

      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200 shadow-sm p-4">
        <p className="text-xs text-red-700 font-semibold uppercase">🚨 Urgent</p>
        <p className="text-3xl font-bold text-red-600 mt-2">{loading ? '-' : urgent}</p>
      </div>
    </div>
  );
}
