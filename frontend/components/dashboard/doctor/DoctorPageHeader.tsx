'use client';

import Link from 'next/link';

interface DoctorPageHeaderProps {
  newConsultationHref?: string;
}

export default function DoctorPageHeader({
  newConsultationHref = '/dashboard/doctor/records',
}: DoctorPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage patients, consultations, and medical records.</p>
      </div>
      <Link
        href={newConsultationHref}
        className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
      >
        Open Records
      </Link>
    </div>
  );
}
