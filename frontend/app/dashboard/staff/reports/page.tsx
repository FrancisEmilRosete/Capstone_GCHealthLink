'use client';

import Link from 'next/link';

export default function StaffReportsScopeNoticePage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 space-y-3">
        <h1 className="text-lg font-bold text-amber-900">Reports Moved To Admin Scope</h1>
        <p className="text-sm text-amber-800">
          Campus-wide reporting and analytics are Admin-only in this MVP. The clinic staff reports view is intentionally hidden.
        </p>
        <div>
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center px-3 py-2 rounded-xl bg-white border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
          >
            Back To Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}
