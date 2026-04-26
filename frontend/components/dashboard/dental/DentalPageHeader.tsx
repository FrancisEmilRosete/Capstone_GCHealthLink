'use client';

import Link from 'next/link';

interface DentalPageHeaderProps {
  checkInHref?: string;
}

export default function DentalPageHeader({
  checkInHref = '/dashboard/staff/scanner',
}: DentalPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🦷 Dental Queue</h1>
        <p className="text-sm text-gray-500 mt-1">Manage dental appointments and patient scheduling.</p>
      </div>
      <Link
        href={checkInHref}
        className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
      >
        + Check In Patient
      </Link>
    </div>
  );
}
