'use client';

import type { VisitRecord } from '@/components/dashboard/doctor/types';
import { formatDate } from '@/components/dashboard/doctor/utils';

interface DoctorRecentConsultationsTableProps {
  recentVisits: VisitRecord[];
}

export default function DoctorRecentConsultationsTable({
  recentVisits,
}: DoctorRecentConsultationsTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">Recent Consultations</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Concern Tag</th>
            </tr>
          </thead>
          <tbody>
            {recentVisits.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  No recent consultations.
                </td>
              </tr>
            ) : (
              recentVisits.map((visit) => (
                <tr key={visit.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDate(visit.visitDate)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {visit.studentProfile.firstName} {visit.studentProfile.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{visit.concernTag || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
