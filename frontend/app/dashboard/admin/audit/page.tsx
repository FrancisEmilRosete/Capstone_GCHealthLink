'use client';

import Link from 'next/link';

export default function AdminAuditPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Detailed per-user audit trails are intentionally restricted in this MVP release.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-800">MVP Policy Notice</p>
        <p className="text-sm text-amber-700 mt-1 leading-relaxed">
          Admin access is limited to aggregated analytics endpoints to align with current RBAC policy.
          Use the Reports page for monthly analytics exports and trends.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Available Admin Actions</p>
        <ul className="mt-3 space-y-2 text-sm text-gray-600">
          <li>View aggregate health analytics dashboards</li>
          <li>Export monthly PDF summaries</li>
          <li>Manage admin settings</li>
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/dashboard/admin/reports"
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-teal-500 text-white hover:bg-teal-600"
          >
            Open Reports
          </Link>
          <Link
            href="/dashboard/admin/settings"
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:border-teal-300 hover:text-teal-600"
          >
            Open Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
