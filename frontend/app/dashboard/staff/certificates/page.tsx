'use client';

import Link from 'next/link';

export default function StaffCertificatesScopeNoticePage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 space-y-3">
        <h1 className="text-lg font-bold text-gray-900">Certificates Hidden In MVP</h1>
        <p className="text-sm text-gray-600">
          Medical excuse letters are intentionally out of MVP scope. This staff page is hidden from navigation and kept
          as a placeholder only.
        </p>
        <div>
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:border-teal-300 hover:text-teal-600 transition-colors"
          >
            Back To Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}
