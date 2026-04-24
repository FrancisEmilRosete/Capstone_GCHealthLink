'use client';

import Link from 'next/link';

import type { QueueItem } from '@/components/dashboard/doctor/types';

interface DoctorPatientDetailsPanelProps {
  selectedPatient: QueueItem | null;
  consultationNotes: string;
  onNotesChange: (value: string) => void;
  onClose: () => void;
}

export default function DoctorPatientDetailsPanel({
  selectedPatient,
  consultationNotes,
  onNotesChange,
  onClose,
}: DoctorPatientDetailsPanelProps) {
  if (!selectedPatient) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center sticky top-6">
        <p className="text-gray-500 text-sm font-medium">Select a patient to view details</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
      <div className="px-4 py-4 border-b border-gray-100 bg-teal-50">
        <p className="text-sm font-bold text-gray-900">Patient Details</p>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase">Name</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {selectedPatient.studentProfile.firstName} {selectedPatient.studentProfile.lastName}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase">ID / Dept</p>
          <p className="text-sm text-gray-700 mt-1">
            {selectedPatient.studentProfile.studentNumber} • {selectedPatient.studentProfile.courseDept}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase">Symptoms</p>
          <p className="text-sm text-gray-700 mt-1">{selectedPatient.symptoms}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Consultation Notes</p>
          <textarea
            value={consultationNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add private consultation notes..."
            className="w-full border border-gray-200 rounded-lg p-2.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-teal-300"
            rows={5}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Link
            href={`/dashboard/doctor/records/${encodeURIComponent(selectedPatient.studentProfile.studentNumber)}`}
            className="flex-1 text-center px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 text-xs font-semibold transition-colors"
          >
            View Full Record
          </Link>
          <button
            className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
          >
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}
