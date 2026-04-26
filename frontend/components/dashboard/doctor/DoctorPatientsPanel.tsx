'use client';

import type { QueueItem } from '@/components/dashboard/doctor/types';
import { hasRiskFlag } from '@/components/dashboard/doctor/utils';

interface DoctorPatientsPanelProps {
  loading: boolean;
  patients: QueueItem[];
  onSelect: (patient: QueueItem) => void;
}

function RiskBadge({ hasRisk }: { hasRisk: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
        hasRisk ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
      }`}
    >
      {hasRisk ? '⚠️ Priority' : '✓ Normal'}
    </span>
  );
}

export default function DoctorPatientsPanel({
  loading,
  patients,
  onSelect,
}: DoctorPatientsPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">Currently Consulting</h2>
      </div>

      {loading ? (
        <div className="px-4 py-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : patients.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-gray-500 text-sm font-medium">No patients currently assigned.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {patients.map((patient) => {
            const history = patient.studentProfile.medicalHistory;
            const hasRisk = hasRiskFlag(history?.asthmaEnc) || hasRiskFlag(history?.diabetesEnc);

            return (
              <div
                key={patient.id}
                onClick={() => onSelect(patient)}
                className="p-4 hover:bg-teal-50 cursor-pointer transition-colors border-l-4 border-teal-400"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {patient.studentProfile.firstName} {patient.studentProfile.lastName}
                    </p>
                    <p className="text-xs text-teal-600 font-medium mt-0.5">
                      {patient.studentProfile.studentNumber}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 truncate">{patient.symptoms}</p>
                  </div>
                  <div className="shrink-0">
                    <RiskBadge hasRisk={hasRisk} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
