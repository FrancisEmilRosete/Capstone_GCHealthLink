'use client';

import type { QueueItem } from '@/components/dashboard/doctor/types';
import { hasRiskFlag } from '@/components/dashboard/doctor/utils';

interface DoctorQueuePanelProps {
  waitingPatients: QueueItem[];
}

export default function DoctorQueuePanel({ waitingPatients }: DoctorQueuePanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">Next in Queue ({waitingPatients.length})</h2>
      </div>

      {waitingPatients.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-gray-500 text-sm font-medium">All patients scheduled.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {waitingPatients.slice(0, 5).map((patient) => {
            const history = patient.studentProfile.medicalHistory;
            const hasRisk = hasRiskFlag(history?.asthmaEnc) || hasRiskFlag(history?.diabetesEnc);

            return (
              <div key={patient.id} className="p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800">
                      {patient.studentProfile.lastName}, {patient.studentProfile.firstName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{patient.symptoms}</p>
                  </div>
                  <div className="shrink-0">
                    {hasRisk && (
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                        Risk
                      </span>
                    )}
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
