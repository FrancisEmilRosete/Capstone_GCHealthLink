'use client';

interface DoctorStatsCardsProps {
  loading: boolean;
  myPatients: number;
  waiting: number;
  urgent: number;
  recentVisits: number;
}

export default function DoctorStatsCards({
  loading,
  myPatients,
  waiting,
  urgent,
  recentVisits,
}: DoctorStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl border border-teal-200 shadow-sm p-4">
        <p className="text-xs text-teal-700 font-semibold uppercase">👨‍⚕️ Current Patients</p>
        <p className="text-3xl font-bold text-teal-600 mt-2">{loading ? '-' : myPatients}</p>
        <p className="text-xs text-teal-600 mt-1">In Progress</p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 shadow-sm p-4">
        <p className="text-xs text-blue-700 font-semibold uppercase">⏳ Waiting Queue</p>
        <p className="text-3xl font-bold text-blue-600 mt-2">{loading ? '-' : waiting}</p>
        <p className="text-xs text-blue-600 mt-1">Pending</p>
      </div>

      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200 shadow-sm p-4">
        <p className="text-xs text-red-700 font-semibold uppercase">🚨 Urgent Cases</p>
        <p className="text-3xl font-bold text-red-600 mt-2">{loading ? '-' : urgent}</p>
        <p className="text-xs text-red-600 mt-1">High Risk</p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 shadow-sm p-4">
        <p className="text-xs text-purple-700 font-semibold uppercase">📋 Recent Visits</p>
        <p className="text-3xl font-bold text-purple-600 mt-2">{loading ? '-' : recentVisits}</p>
        <p className="text-xs text-purple-600 mt-1">This week</p>
      </div>
    </div>
  );
}
