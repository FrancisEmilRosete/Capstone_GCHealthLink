'use client';

import Link from 'next/link';

import type { DentalSortOption, QueueItem } from '@/components/dashboard/dental/types';
import { formatDate, formatTime, hasRiskFlag } from '@/components/dashboard/dental/utils';

interface DentalQueueTableProps {
  loading: boolean;
  sortBy: DentalSortOption;
  onSortChange: (value: DentalSortOption) => void;
  sortedQueue: QueueItem[];
}

export default function DentalQueueTable({
  loading,
  sortBy,
  onSortChange,
  sortedQueue,
}: DentalQueueTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-800">Dental Appointments</h2>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as DentalSortOption)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
        >
          <option value="priority">Sort by Priority</option>
          <option value="date">Sort by Date</option>
        </select>
      </div>

      {loading ? (
        <div className="px-4 py-12 text-center text-gray-400 text-sm">Loading dental queue...</div>
      ) : sortedQueue.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-gray-500 text-sm font-medium">No dental appointments scheduled.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Scheduled</th>
                <th className="px-4 py-3 text-left">Symptoms</th>
                <th className="px-4 py-3 text-left">Risk</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedQueue.map((item) => {
                const history = item.studentProfile.medicalHistory;
                const hasRisk = hasRiskFlag(history?.asthmaEnc) || hasRiskFlag(history?.diabetesEnc);
                const statusColor =
                  item.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-700'
                    : item.status === 'IN_PROGRESS'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700';

                return (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full font-semibold ${statusColor}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {item.studentProfile.lastName}, {item.studentProfile.firstName}
                        </p>
                        <p className="text-gray-500">{item.studentProfile.studentNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.studentProfile.courseDept}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(item.preferredDate)} {formatTime(item.preferredTime)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{item.symptoms}</td>
                    <td className="px-4 py-3">
                      {hasRisk ? (
                        <span className="inline-block px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                          🚨 High Risk
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                          ✓ Normal
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/dental/records/${encodeURIComponent(item.studentProfile.studentNumber)}`}
                        className="text-teal-600 hover:text-teal-800 font-semibold hover:underline"
                      >
                        View Record
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
